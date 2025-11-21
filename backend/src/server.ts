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
import { createToolsRouter } from './routes/tools';
import { ToolService } from './services/tool-service';
import { OrderService } from './services/order-service';
import { MenuService } from './services/menu-service';
import { RestaurantService } from './services/restaurant-service';
import { setupSwagger } from './config/swagger';
import { LlmDocService } from './services/llm-doc-service';

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
  const menuService = new MenuService(db);
  const restaurantService = new RestaurantService(db);
  const orderService = new OrderService(db, menuService, restaurantService);

  app.use('/webhook', createWebhookRouter(ticketService, messageService, mediaService, wahaService, n8nService));
  app.use('/api/tickets', createTicketsRouter(ticketService, messageService, mediaService));
  app.use('/api/messages', createMessagesRouter(ticketService, messageService, wahaService));
  
  const toolService = new ToolService(ticketService, orderService, menuService, restaurantService);
  app.use('/api/tools', createToolsRouter(toolService));

  /**
   * @swagger
   * /api/media/{id}:
   *   get:
   *     summary: Baixa uma mídia armazenada
   *     tags: [Media]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID da mídia (UUID, filename ou WAHA message ID)
   *     responses:
   *       200:
   *         description: Arquivo binário da mídia
   *         content:
   *           image/*:
   *             schema:
   *               type: string
   *               format: binary
   *           video/*:
   *             schema:
   *               type: string
   *               format: binary
   *           audio/*:
   *             schema:
   *               type: string
   *               format: binary
   *           application/*:
   *             schema:
   *               type: string
   *               format: binary
   *       404:
   *         description: Mídia não encontrada
   */
  app.get('/api/media/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      let media;
      if (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        media = await mediaService.getMedia(id);
      } else {
        const mediaByFilename = await mediaService.getMediaByFilename(id);
        if (mediaByFilename) {
          media = mediaByFilename;
        } else {
          const message = await messageService.getMessageByWahaId(id);
          if (message && message.mediaId) {
            media = await mediaService.getMedia(message.mediaId);
          }
        }
      }
      
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

  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Health check
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: API está funcionando
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   */
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/webhook/test', (_req, res) => {
    res.json({ message: 'Webhook endpoint is working' });
  });

  // Swagger documentation
  setupSwagger(app);

  // LLM documentation endpoint
  const llmDocService = new LlmDocService();
  app.get('/llm.txt', (_req, res) => {
    try {
      const doc = llmDocService.generateLlmTxt();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(doc);
    } catch (error) {
      console.error('Error generating LLM documentation:', error);
      res.status(500).json({ error: 'Failed to generate documentation' });
    }
  });

  return app;
};


