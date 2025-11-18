import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database-service';
import { Message, MessageDirection, CreateMessageData } from '../types/message';

export class MessageService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  async createMessage(data: CreateMessageData): Promise<Message> {
    const id = uuidv4();
    const result = await this.db.query(`
      INSERT INTO messages (
        id, ticket_id, contact_number, direction, message_type, 
        content, media_id, waha_message_id, is_ai_generated, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id, ticket_id, contact_number, direction, message_type, 
                content, media_id, waha_message_id, is_ai_generated, created_at
    `, [
      id,
      data.ticketId,
      data.contactNumber,
      data.direction,
      data.messageType,
      data.content,
      data.mediaId || null,
      data.wahaMessageId || null,
      data.isAiGenerated || false,
    ]);

    return this.mapRowToMessage(result.rows[0]);
  }

  async getMessagesByTicket(ticketId: string): Promise<Message[]> {
    const result = await this.db.query(`
      SELECT id, ticket_id, contact_number, direction, message_type, 
             content, media_id, waha_message_id, is_ai_generated, created_at
      FROM messages
      WHERE ticket_id = $1
      ORDER BY created_at ASC
    `, [ticketId]);

    return result.rows.map((row: {
      id: string;
      ticket_id: string;
      contact_number: string;
      direction: string;
      message_type: string;
      content: string;
      media_id: string | null;
      waha_message_id: string | null;
      is_ai_generated: boolean;
      created_at: Date;
    }) => this.mapRowToMessage(row));
  }

  async getMessagesByContact(contactNumber: string): Promise<Message[]> {
    const result = await this.db.query(`
      SELECT id, ticket_id, contact_number, direction, message_type, 
             content, media_id, waha_message_id, is_ai_generated, created_at
      FROM messages
      WHERE contact_number = $1
      ORDER BY created_at ASC
    `, [contactNumber]);

    return result.rows.map((row: {
      id: string;
      ticket_id: string;
      contact_number: string;
      direction: string;
      message_type: string;
      content: string;
      media_id: string | null;
      waha_message_id: string | null;
      is_ai_generated: boolean;
      created_at: Date;
    }) => this.mapRowToMessage(row));
  }

  async getMessage(id: string): Promise<Message | null> {
    const result = await this.db.query(`
      SELECT id, ticket_id, contact_number, direction, message_type, 
             content, media_id, waha_message_id, is_ai_generated, created_at
      FROM messages
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMessage(result.rows[0]);
  }

  private mapRowToMessage(row: {
    id: string;
    ticket_id: string;
    contact_number: string;
    direction: string;
    message_type: string;
    content: string;
    media_id: string | null;
    waha_message_id: string | null;
    is_ai_generated: boolean;
    created_at: Date;
  }): Message {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      contactNumber: row.contact_number,
      direction: row.direction as MessageDirection,
      messageType: row.message_type,
      content: row.content,
      mediaId: row.media_id || undefined,
      wahaMessageId: row.waha_message_id || undefined,
      isAiGenerated: row.is_ai_generated,
      createdAt: new Date(row.created_at),
    };
  }
}

