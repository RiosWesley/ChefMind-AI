import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database-service';
import { Ticket, TicketStatus, CreateTicketData } from '../types/ticket';

const TICKET_TIMEOUT_MINUTES = 15;
const TICKET_TIMEOUT_MS = TICKET_TIMEOUT_MINUTES * 60 * 1000;

export class TicketService {
  private db: DatabaseService;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(db: DatabaseService) {
    this.db = db;
    this.startAutoCloseCheck();
  }

  private startAutoCloseCheck(): void {
    this.checkInterval = setInterval(() => {
      this.checkAndCloseExpiredTickets();
    }, 60000);
  }

  private async checkAndCloseExpiredTickets(): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT id, last_interaction_at 
        FROM tickets 
        WHERE status = $1
      `, [TicketStatus.OPEN]);

      const now = new Date();
      for (const row of result.rows) {
        const lastInteraction = new Date(row.last_interaction_at);
        const timeSinceLastInteraction = now.getTime() - lastInteraction.getTime();
        
        if (timeSinceLastInteraction >= TICKET_TIMEOUT_MS) {
          await this.closeTicket(row.id);
          console.log(`Ticket ${row.id} closed automatically due to inactivity`);
        }
      }
    } catch (error) {
      console.error('Error checking expired tickets:', error);
    }
  }

  async createTicket(data: CreateTicketData): Promise<Ticket> {
    const id = uuidv4();
    const result = await this.db.query(`
      INSERT INTO tickets (id, contact_number, status, created_at, last_interaction_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, contact_number, status, created_at, last_interaction_at, closed_at
    `, [id, data.contactNumber, TicketStatus.OPEN]);

    return this.mapRowToTicket(result.rows[0]);
  }

  async getTicket(id: string): Promise<Ticket | null> {
    const result = await this.db.query(`
      SELECT id, contact_number, status, created_at, last_interaction_at, closed_at
      FROM tickets
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTicket(result.rows[0]);
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (updates.lastInteractionAt !== undefined) {
      setClauses.push(`last_interaction_at = $${paramIndex++}`);
      values.push(updates.lastInteractionAt);
    }

    if (updates.closedAt !== undefined) {
      setClauses.push(`closed_at = $${paramIndex++}`);
      values.push(updates.closedAt);
    }

    if (setClauses.length === 0) {
      return this.getTicket(id);
    }

    setClauses.push(`last_interaction_at = NOW()`);
    values.push(id);

    const result = await this.db.query(`
      UPDATE tickets
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, contact_number, status, created_at, last_interaction_at, closed_at
    `, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTicket(result.rows[0]);
  }

  async closeTicket(id: string): Promise<boolean> {
    const result = await this.db.query(`
      UPDATE tickets
      SET status = $1, closed_at = NOW(), last_interaction_at = NOW()
      WHERE id = $2
      RETURNING id
    `, [TicketStatus.CLOSED, id]);

    return result.rows.length > 0;
  }

  async updateLastInteraction(id: string): Promise<void> {
    await this.db.query(`
      UPDATE tickets
      SET last_interaction_at = NOW()
      WHERE id = $1
    `, [id]);
  }

  async getTicketByContact(contactNumber: string): Promise<Ticket | null> {
    const result = await this.db.query(`
      SELECT id, contact_number, status, created_at, last_interaction_at, closed_at
      FROM tickets
      WHERE contact_number = $1 AND status = $2
      ORDER BY created_at DESC
      LIMIT 1
    `, [contactNumber, TicketStatus.OPEN]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTicket(result.rows[0]);
  }

  private mapRowToTicket(row: {
    id: string;
    contact_number: string;
    status: string;
    created_at: Date;
    last_interaction_at: Date;
    closed_at: Date | null;
  }): Ticket {
    return {
      id: row.id,
      contactNumber: row.contact_number,
      status: row.status as TicketStatus,
      createdAt: new Date(row.created_at),
      lastInteractionAt: new Date(row.last_interaction_at),
      closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
    };
  }

  async destroy(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}
