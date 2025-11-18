import express, { Express } from 'express';
import axios from 'axios';
import { TicketService } from './services/ticket-service';
import { WahaService } from './services/waha-service';
import { N8nService } from './services/n8n-service';
import { createWebhookRouter } from './routes/webhook';
import { createTicketsRouter } from './routes/tickets';

export const createServer = (): Express => {
  const app = express();

  app.use(express.json());

  const ticketService = new TicketService();
  const wahaService = new WahaService();
  const n8nService = new N8nService();

  app.use('/webhook', createWebhookRouter(ticketService, wahaService, n8nService));
  app.use('/api/tickets', createTicketsRouter(ticketService));

  app.get('/api/media/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      const wahaApiUrl = process.env.WAHA_API_URL || 'http://waha:3000';
      const apiKey = process.env.WAHA_API_KEY || '';
      
      const mediaUrl = `${wahaApiUrl}/api/files/default/${filename}`;
      
      const response = await axios.get(mediaUrl, {
        headers: {
          'X-Api-Key': apiKey,
        },
        responseType: 'stream',
      });
      
      res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
      response.data.pipe(res);
    } catch (error) {
      console.error('Error proxying media:', error);
      res.status(500).json({ error: 'Failed to fetch media' });
    }
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/webhook/test', (_req, res) => {
    res.json({ message: 'Webhook endpoint is working' });
  });

  return app;
};


