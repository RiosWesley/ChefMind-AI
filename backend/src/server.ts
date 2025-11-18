import express, { Express } from 'express';
import { TicketService } from './services/ticket-service';
import { N8nService } from './services/n8n-service';
import { createWebhookRouter } from './routes/webhook';
import { createTicketsRouter } from './routes/tickets';

export const createServer = (): Express => {
  const app = express();

  app.use(express.json());

  const ticketService = new TicketService();
  const n8nService = new N8nService();

  app.use('/webhook', createWebhookRouter(ticketService, n8nService));
  app.use('/api/tickets', createTicketsRouter(ticketService));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/webhook/test', (_req, res) => {
    res.json({ message: 'Webhook endpoint is working' });
  });

  return app;
};


