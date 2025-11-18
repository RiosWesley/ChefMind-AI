import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { Ticket, TicketStatus, CreateTicketData } from '../types/ticket';

const TICKET_TIMEOUT_MINUTES = 15;
const TICKET_TIMEOUT_MS = TICKET_TIMEOUT_MINUTES * 60 * 1000;

export class TicketService {
  private redis: Redis | null = null;
  private memoryStore: Map<string, Ticket> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeRedis();
    this.startAutoCloseCheck();
  }

  private async initializeRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl);
        this.redis.on('error', (error) => {
          console.error('Redis connection error:', error);
          this.redis = null;
        });
        console.log('Redis connected');
      } catch (error) {
        console.error('Failed to connect to Redis, using memory store:', error);
        this.redis = null;
      }
    }
  }

  private startAutoCloseCheck(): void {
    this.checkInterval = setInterval(() => {
      this.checkAndCloseExpiredTickets();
    }, 60000);
  }

  private async checkAndCloseExpiredTickets(): Promise<void> {
    const now = new Date();
    const tickets = await this.getAllTickets();

    for (const ticket of tickets) {
      if (ticket.status === TicketStatus.CLOSED) {
        continue;
      }

      const timeSinceLastInteraction = now.getTime() - ticket.lastInteractionAt.getTime();
      if (timeSinceLastInteraction >= TICKET_TIMEOUT_MS) {
        await this.closeTicket(ticket.id);
        console.log(`Ticket ${ticket.id} closed automatically due to inactivity`);
      }
    }
  }

  async createTicket(data: CreateTicketData): Promise<Ticket> {
    const ticket: Ticket = {
      id: uuidv4(),
      contactNumber: data.contactNumber,
      originalMessage: data.originalMessage,
      messageType: data.messageType,
      mediaUrl: data.mediaUrl,
      status: TicketStatus.OPEN,
      createdAt: new Date(),
      lastInteractionAt: new Date(),
    };

    await this.saveTicket(ticket);
    return ticket;
  }

  async getTicket(id: string): Promise<Ticket | null> {
    if (this.redis) {
      const data = await this.redis.get(`ticket:${id}`);
      if (!data) return null;
      return this.deserializeTicket(JSON.parse(data));
    }

    const ticket = this.memoryStore.get(id);
    return ticket ? { ...ticket } : null;
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | null> {
    const ticket = await this.getTicket(id);
    if (!ticket) return null;

    const updatedTicket: Ticket = {
      ...ticket,
      ...updates,
      lastInteractionAt: new Date(),
    };

    await this.saveTicket(updatedTicket);
    return updatedTicket;
  }

  async closeTicket(id: string): Promise<boolean> {
    const ticket = await this.getTicket(id);
    if (!ticket) return false;

    await this.updateTicket(id, { status: TicketStatus.CLOSED });
    return true;
  }

  async updateLastInteraction(id: string): Promise<void> {
    const ticket = await this.getTicket(id);
    if (ticket) {
      await this.updateTicket(id, { lastInteractionAt: new Date() });
    }
  }

  private async getAllTickets(): Promise<Ticket[]> {
    if (this.redis) {
      const keys = await this.redis.keys('ticket:*');
      const tickets: Ticket[] = [];
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          tickets.push(this.deserializeTicket(JSON.parse(data)));
        }
      }
      return tickets;
    }

    return Array.from(this.memoryStore.values());
  }

  private async saveTicket(ticket: Ticket): Promise<void> {
    const serialized = this.serializeTicket(ticket);

    if (this.redis) {
      await this.redis.set(`ticket:${ticket.id}`, JSON.stringify(serialized));
    } else {
      this.memoryStore.set(ticket.id, ticket);
    }
  }

  private serializeTicket(ticket: Ticket): Record<string, unknown> {
    return {
      ...ticket,
      createdAt: ticket.createdAt.toISOString(),
      lastInteractionAt: ticket.lastInteractionAt.toISOString(),
    };
  }

  private deserializeTicket(data: Record<string, unknown>): Ticket {
    return {
      ...data,
      createdAt: new Date(data.createdAt as string),
      lastInteractionAt: new Date(data.lastInteractionAt as string),
    } as Ticket;
  }

  async getTicketByContact(contactNumber: string): Promise<Ticket | null> {
    const tickets = await this.getAllTickets();
    const activeTicket = tickets.find(
      (t) => t.contactNumber === contactNumber && t.status !== TicketStatus.CLOSED
    );
    return activeTicket || null;
  }

  async destroy(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    if (this.redis) {
      await this.redis.quit();
    }
  }
}


