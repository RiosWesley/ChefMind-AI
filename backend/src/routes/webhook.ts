import { Router, Request, Response } from 'express';
import { WahaWebhookEvent, WahaMessage } from '../types/waha';
import { TicketService } from '../services/ticket-service';
import { N8nService } from '../services/n8n-service';
import { TicketStatus } from '../types/ticket';

export const createWebhookRouter = (
  ticketService: TicketService,
  n8nService: N8nService
): Router => {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    try {
      const body = req.body;
      
      let event: WahaWebhookEvent;
      let message: WahaMessage;

      if (body.event) {
        event = body as WahaWebhookEvent;
        if (event.event !== 'message') {
          return res.status(200).json({ received: true });
        }
        message = event.payload as WahaMessage;
      } else if (body.type || body.from) {
        message = body as WahaMessage;
      } else {
        return res.status(200).json({ received: true });
      }

      if (message.fromMe) {
        return res.status(200).json({ received: true });
      }

      const messageType = normalizeMessageType(message);
      const normalizedMessage = {
        ...message,
        type: messageType,
      };

      const messageTypes = ['chat', 'text', 'image', 'video', 'audio', 'document', 'voice', 'ptt', 'sticker'];
      if (messageTypes.includes(normalizedMessage.type)) {
        await handleNewMessage(normalizedMessage, ticketService, n8nService);
        return res.status(200).json({ received: true });
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

function normalizeMessageType(message: WahaMessage): string {
  if (message.type) {
    return message.type.toLowerCase();
  }

  if (message._data?.Info?.Type) {
    const type = message._data.Info.Type.toLowerCase();
    if (type === 'text' || type === 'chat') {
      return 'text';
    }
    return type;
  }

  if (message.hasMedia) {
    if (message._data?.Info?.MediaType) {
      return message._data.Info.MediaType.toLowerCase();
    }
    return 'media';
  }

  if (message.body) {
    return 'text';
  }

  return 'text';
}

async function handleNewMessage(
  message: WahaMessage,
  ticketService: TicketService,
  n8nService: N8nService
): Promise<void> {
  const existingTicket = await ticketService.getTicketByContact(message.from);

  const messageType = normalizeMessageType(message);
  const messageText = message.body || message.caption || `[${messageType}]`;
  let mediaUrl = message.mediaUrl || undefined;
  
  if (message.hasMedia && message.media && typeof message.media === 'object') {
    mediaUrl = message.media.url || message.media.mediaUrl || mediaUrl;
  }

  let ticket;
  if (existingTicket && existingTicket.status !== TicketStatus.CLOSED) {
    ticket = existingTicket;
    await ticketService.updateLastInteraction(ticket.id);
  } else {
    ticket = await ticketService.createTicket({
      contactNumber: message.from,
      originalMessage: messageText,
      messageType: messageType,
      mediaUrl,
    });
  }

  console.log(`Recebida mensagem ticket ${ticket.id}`);

  try {
    await n8nService.sendTicketData({
      message: messageText,
      contactNumber: ticket.contactNumber,
      ticketId: ticket.id,
      messageType: messageType,
      mediaUrl,
    });

    await ticketService.updateTicket(ticket.id, {
      status: TicketStatus.SENT_TO_N8N,
    });

    console.log(`Enviando para n8n ticket ${ticket.id}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('404') || errorMessage.includes('not registered')) {
      console.error(`Webhook n8n não encontrado. Verifique se o workflow está ATIVO no n8n. Ticket ${ticket.id} não enviado.`);
    } else {
      console.error(`Erro ao enviar ticket ${ticket.id} para n8n:`, errorMessage);
    }
    
    throw error;
  }
}

