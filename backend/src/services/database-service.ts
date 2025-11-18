import { Pool, PoolClient } from 'pg';

export class DatabaseService {
  private pool: Pool;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL || 
      'postgresql://default:default@postgres:5432/default';
    
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.pool.on('error', (error) => {
      console.error('Unexpected error on idle client', error);
    });
  }

  async waitForConnection(maxRetries = 30, delayMs = 1000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const client = await this.pool.connect();
        client.release();
        console.log('Database connection established');
        return;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(`Failed to connect to database after ${maxRetries} attempts: ${error}`);
        }
        console.log(`Waiting for database connection... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  async initialize(): Promise<void> {
    await this.waitForConnection();
    await this.runMigrations();
  }

  private async runMigrations(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`
        CREATE TYPE ticket_status AS ENUM ('open', 'closed');
      `);

      await client.query(`
        CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contact_number VARCHAR(255) NOT NULL,
          session_name VARCHAR(255) NOT NULL,
          status ticket_status NOT NULL DEFAULT 'open',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          last_interaction_at TIMESTAMP NOT NULL DEFAULT NOW(),
          closed_at TIMESTAMP
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tickets_contact_number ON tickets(contact_number);
        CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
          contact_number VARCHAR(255) NOT NULL,
          direction message_direction NOT NULL,
          message_type VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          media_id UUID,
          waha_message_id VARCHAR(255),
          is_ai_generated BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON messages(ticket_id);
        CREATE INDEX IF NOT EXISTS idx_messages_contact_number ON messages(contact_number);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS media (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
          message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
          filename VARCHAR(255) NOT NULL,
          mimetype VARCHAR(100) NOT NULL,
          file_size BIGINT NOT NULL,
          file_data BYTEA NOT NULL,
          original_url TEXT,
          transcription TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_media_ticket_id ON media(ticket_id);
        CREATE INDEX IF NOT EXISTS idx_media_message_id ON media(message_id);
      `);

      await client.query('COMMIT');
      
      // Migration: Add session_name column if it doesn't exist
      try {
        const checkResult = await this.pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'tickets' AND column_name = 'session_name';
        `);
        
        if (checkResult.rows.length === 0) {
          await this.pool.query(`
            ALTER TABLE tickets 
            ADD COLUMN session_name VARCHAR(255) NOT NULL DEFAULT 'default';
          `);
          console.log('Migration: session_name column added to tickets table');
        }
      } catch (error) {
        console.error('Error adding session_name column:', error);
      }
      
      // Migration: Make message_id nullable (for existing tables)
      // This needs to be outside the transaction to avoid rollback issues
      try {
        const checkResult = await this.pool.query(`
          SELECT column_name, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'media' AND column_name = 'message_id';
        `);
        
        if (checkResult.rows.length > 0 && checkResult.rows[0].is_nullable === 'NO') {
          await this.pool.query(`
            ALTER TABLE media 
            ALTER COLUMN message_id DROP NOT NULL;
          `);
          console.log('Migration: message_id column in media table is now nullable');
        }
      } catch (error) {
        console.error('Error altering media.message_id column:', error);
        // Don't throw - this is a migration that may fail if column doesn't exist
      }

      // Add foreign key constraint (outside transaction)
      try {
        await this.pool.query(`
          ALTER TABLE messages 
          ADD CONSTRAINT fk_messages_media 
          FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE SET NULL;
        `);
      } catch (error) {
        if (!(error as Error).message.includes('already exists')) {
          console.error('Error adding fk_messages_media constraint:', error);
        }
      }
      console.log('Database migrations completed');
    } catch (error) {
      await client.query('ROLLBACK');
      if ((error as Error).message.includes('already exists')) {
        console.log('Database tables already exist');
      } else {
        console.error('Migration error:', error);
        throw error;
      }
    } finally {
      client.release();
    }
  }

  async query(text: string, params?: unknown[]): Promise<any> {
    return this.pool.query(text, params);
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

