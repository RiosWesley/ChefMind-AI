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
        CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
      `);

      await client.query(`
        CREATE TYPE delivery_type AS ENUM ('delivery', 'pickup');
      `);

      await client.query(`
        CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
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

      await client.query(`
        CREATE TABLE IF NOT EXISTS menu_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          display_order INTEGER DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_menu_categories_is_active ON menu_categories(is_active);
        CREATE INDEX IF NOT EXISTS idx_menu_categories_display_order ON menu_categories(display_order);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS menu_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          image_url TEXT,
          ingredients TEXT[],
          allergens TEXT[],
          is_available BOOLEAN NOT NULL DEFAULT true,
          display_order INTEGER DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
        CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON menu_items(is_available);
        CREATE INDEX IF NOT EXISTS idx_menu_items_display_order ON menu_items(display_order);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
          contact_number VARCHAR(255) NOT NULL,
          status order_status NOT NULL DEFAULT 'pending',
          delivery_type delivery_type NOT NULL,
          delivery_address TEXT,
          subtotal DECIMAL(10,2) NOT NULL,
          delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
          total DECIMAL(10,2) NOT NULL,
          estimated_time_minutes INTEGER,
          cancelled_at TIMESTAMP,
          cancellation_reason TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_ticket_id ON orders(ticket_id);
        CREATE INDEX IF NOT EXISTS idx_orders_contact_number ON orders(contact_number);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          subtotal DECIMAL(10,2) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
        CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS restaurant_info (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(255),
          address TEXT,
          opening_hours JSONB,
          delivery_area TEXT[],
          delivery_fee DECIMAL(10,2),
          min_order_value DECIMAL(10,2),
          estimated_delivery_time_minutes INTEGER,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS promotions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          discount_type discount_type NOT NULL,
          discount_value DECIMAL(10,2) NOT NULL,
          min_order_value DECIMAL(10,2),
          valid_from TIMESTAMP NOT NULL,
          valid_until TIMESTAMP NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_promotions_is_active ON promotions(is_active);
        CREATE INDEX IF NOT EXISTS idx_promotions_valid_from ON promotions(valid_from);
        CREATE INDEX IF NOT EXISTS idx_promotions_valid_until ON promotions(valid_until);
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

      // Verify restaurant_info has at least one record (for singleton pattern)
      try {
        const restaurantCheck = await this.pool.query(`
          SELECT COUNT(*) as count FROM restaurant_info;
        `);
        if (restaurantCheck.rows[0].count === '0') {
          await this.pool.query(`
            INSERT INTO restaurant_info (id, name, opening_hours, delivery_fee, min_order_value, estimated_delivery_time_minutes)
            VALUES (gen_random_uuid(), 'Restaurante', '{}'::jsonb, 0, 0, 30);
          `);
          console.log('Migration: Initial restaurant_info record created');
        }
      } catch (error) {
        console.error('Error checking/creating restaurant_info:', error);
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

