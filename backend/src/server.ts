import express, { Express } from 'express';
import axios from 'axios';
import { DatabaseService } from './services/database-service';
import { TicketService } from './services/ticket-service';
import { MessageService } from './services/message-service';
import { MediaService } from './services/media-service';
import { WhisperService } from './services/whisper-service';
import { WahaService } from './services/waha-service';
import { N8nService } from './services/n8n-service';
import { createWebhookRouter } from './routes/webhook';
import { createTicketsRouter } from './routes/tickets';
import { createMessagesRouter } from './routes/messages';

export const createServer = async (): Promise<Express> => {
  const app = express();

  app.use(express.json());

  const db = new DatabaseService();
  await db.initialize();

  const whisperService = new WhisperService();
  const ticketService = new TicketService(db);
  const messageService = new MessageService(db);
  const mediaService = new MediaService(db, whisperService);
  const wahaService = new WahaService();
  const n8nService = new N8nService();

  app.use('/webhook', createWebhookRouter(ticketService, messageService, mediaService, wahaService, n8nService));
  app.use('/api/tickets', createTicketsRouter(ticketService, messageService, mediaService));
  app.use('/api/messages', createMessagesRouter(ticketService, messageService, wahaService));

  app.get('/api/media/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const media = await mediaService.getMedia(id);
      
      if (!media) {
        return res.status(404).json({ error: 'Media not found' });
      }
      
      res.setHeader('Content-Type', media.mimetype);
      res.setHeader('Content-Length', media.fileSize);
      res.send(media.fileData);
    } catch (error) {
      console.error('Error serving media:', error);
      res.status(500).json({ error: 'Failed to serve media' });
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


