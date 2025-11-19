import request from 'supertest';
import express, { Express } from 'express';
import { createServer } from '../server';
import { DatabaseService } from '../services/database-service';
import { TicketService } from '../services/ticket-service';

describe('API Routes', () => {
  let app: Express;
  let db: DatabaseService;
  let ticketService: TicketService;

  beforeAll(async () => {
    db = new DatabaseService();
    await db.initialize();
    app = await createServer();
    ticketService = new TicketService(db);
  });

  afterAll(async () => {
    await db.query('DELETE FROM messages');
    await db.query('DELETE FROM media');
    await db.query('DELETE FROM tickets');
    await db.close();
  });

  beforeEach(async () => {
    await db.query('DELETE FROM messages');
    await db.query('DELETE FROM media');
    await db.query('DELETE FROM tickets');
  });

  describe('Health Check', () => {
    it('GET /health should return ok', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('Webhook', () => {
    it('POST /webhook should accept WAHA message event', async () => {
      const payload = {
        event: 'message',
        session: 'default',
        payload: {
          id: 'msg_123',
          from: '5511999999999@c.us',
          to: null,
          body: 'Hello',
          timestamp: Date.now(),
          type: 'text',
          fromMe: false,
          hasMedia: false,
        },
      };

      const response = await request(app)
        .post('/webhook')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
    });

    it('POST /webhook should ignore messages from me', async () => {
      const payload = {
        event: 'message',
        session: 'default',
        payload: {
          id: 'msg_123',
          from: '5511999999999@c.us',
          body: 'Hello',
          timestamp: Date.now(),
          type: 'text',
          fromMe: true,
        },
      };

      const response = await request(app)
        .post('/webhook')
        .send(payload);

      expect(response.status).toBe(200);
    });
  });

  describe('Tickets API', () => {
    it('GET /api/tickets/:id should return ticket with messages', async () => {
      const ticket = await ticketService.createTicket({
        contactNumber: '5511999999999@c.us',
      });

      const response = await request(app).get(`/api/tickets/${ticket.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(ticket.id);
      expect(response.body.messages).toBeDefined();
      expect(Array.isArray(response.body.messages)).toBe(true);
    });

    it('GET /api/tickets/:id should return 404 for non-existent ticket', async () => {
      const response = await request(app).get('/api/tickets/00000000-0000-0000-0000-000000000000');
      expect(response.status).toBe(404);
    });

    it('GET /api/tickets/:id/messages should return messages', async () => {
      const ticket = await ticketService.createTicket({
        contactNumber: '5511999999999@c.us',
      });

      const response = await request(app).get(`/api/tickets/${ticket.id}/messages`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('POST /api/tickets/:id/close should close ticket', async () => {
      const ticket = await ticketService.createTicket({
        contactNumber: '5511999999999@c.us',
      });

      const response = await request(app).post(`/api/tickets/${ticket.id}/close`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const closedTicket = await ticketService.getTicket(ticket.id);
      expect(closedTicket?.status).toBe('closed');
    });

    it('GET /api/tickets/contact/:contactNumber should return ticket with messages', async () => {
      await ticketService.createTicket({
        contactNumber: '5511999999999@c.us',
      });

      const response = await request(app).get('/api/tickets/contact/5511999999999@c.us');

      expect(response.status).toBe(200);
      expect(response.body.contactNumber).toBe('5511999999999@c.us');
      expect(response.body.messages).toBeDefined();
    });
  });

  describe('Messages API', () => {
    it('POST /api/messages should send message and save to database', async () => {
      const ticket = await ticketService.createTicket({
        contactNumber: '5511999999999@c.us',
      });

      const response = await request(app)
        .post('/api/messages')
        .send({
          ticketId: ticket.id,
          message: 'Hello from n8n',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('POST /api/messages should return 400 if ticketId is missing', async () => {
      const response = await request(app)
        .post('/api/messages')
        .send({
          message: 'Hello',
        });

      expect(response.status).toBe(400);
    });

    it('POST /api/messages should return 404 if ticket not found', async () => {
      const response = await request(app)
        .post('/api/messages')
        .send({
          ticketId: '00000000-0000-0000-0000-000000000000',
          message: 'Hello',
        });

      expect(response.status).toBe(404);
    });
  });
});



