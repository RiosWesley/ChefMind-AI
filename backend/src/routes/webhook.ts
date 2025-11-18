import { Router, Request, Response } from 'express';
import { WahaWebhookEvent, WahaMessage } from '../types/waha';
import { TicketService } from '../services/ticket-service';
import { MessageService } from '../services/message-service';
import { MediaService } from '../services/media-service';
import { WahaService } from '../services/waha-service';
import { N8nService } from '../services/n8n-service';
import { TicketStatus } from '../types/ticket';
import { MessageDirection } from '../types/message';

export const createWebhookRouter = (
  ticketService: TicketService,
  messageService: MessageService,
  mediaService: MediaService,
  wahaService: WahaService,
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

      if (message.hasMedia || messageType !== 'text') {
        console.log('Mensagem com mídia detectada:', {
          type: messageType,
          hasMedia: message.hasMedia,
          mediaUrl: message.mediaUrl,
          media: message.media ? Object.keys(message.media) : null,
          _dataType: message._data?.Info?.Type,
          _dataMediaType: message._data?.Info?.MediaType,
        });
      }

      const messageTypes = ['chat', 'text', 'image', 'video', 'audio', 'document', 'voice', 'ptt', 'sticker', 'media'];
      if (messageTypes.includes(normalizedMessage.type)) {
        await handleNewMessage(normalizedMessage, ticketService, messageService, mediaService, wahaService, n8nService);
        return res.status(200).json({ received: true });
      }

      console.log(`Tipo de mensagem não processado: ${normalizedMessage.type}`);
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

function normalizeMessageType(message: WahaMessage): string {
  if (message._data?.Info?.MediaType) {
    const mediaType = message._data.Info.MediaType.toLowerCase();
    if (mediaType === 'ptt' || mediaType === 'voice' || mediaType === 'audio') {
      return 'audio';
    }
    if (mediaType === 'image' || mediaType === 'video' || mediaType === 'document') {
      return mediaType;
    }
  }

  if (message._data?.Message?.audioMessage || message._data?.Message?.voiceMessage || message._data?.Message?.ptt) {
    return 'audio';
  }

  if (message.type) {
    const type = message.type.toLowerCase();
    if (type === 'ptt' || type === 'voice') {
      return 'audio';
    }
    if (type === 'media' && message._data?.Info?.MediaType) {
      const mediaType = message._data.Info.MediaType.toLowerCase();
      if (mediaType === 'ptt' || mediaType === 'voice' || mediaType === 'audio') {
        return 'audio';
      }
      return mediaType;
    }
    return type;
  }

  if (message._data?.Info?.Type) {
    const type = message._data.Info.Type.toLowerCase();
    if (type === 'text' || type === 'chat') {
      return 'text';
    }
    if (type === 'ptt' || type === 'voice') {
      return 'audio';
    }
    if (type === 'media' && message._data?.Info?.MediaType) {
      const mediaType = message._data.Info.MediaType.toLowerCase();
      if (mediaType === 'ptt' || mediaType === 'voice' || mediaType === 'audio') {
        return 'audio';
      }
      return mediaType;
    }
    return type;
  }

  if (message.hasMedia) {
    if (message.mimetype?.startsWith('audio/')) {
      return 'audio';
    }
    if (message.mimetype?.startsWith('image/')) {
      return 'image';
    }
    if (message.mimetype?.startsWith('video/')) {
      return 'video';
    }
    return 'media';
  }

  if (message.body) {
    return 'text';
  }

  return 'text';
}

function normalizeMediaUrl(url: string, wahaService: WahaService): string {
  const backendPublicUrl = process.env.BACKEND_PUBLIC_URL || 'http://backend:3001';
  
  const pathMatch = url.match(/\/api\/files\/[^/]+\/(.+)$/);
  if (pathMatch) {
    const filename = pathMatch[1];
    return `${backendPublicUrl}/api/media/${filename}`;
  }
  
  return url;
}

async function handleNewMessage(
  message: WahaMessage,
  ticketService: TicketService,
  messageService: MessageService,
  mediaService: MediaService,
  wahaService: WahaService,
  n8nService: N8nService
): Promise<void> {
  const existingTicket = await ticketService.getTicketByContact(message.from);

  const messageType = normalizeMessageType(message);
  const messageText = message.body || message.caption || `[${messageType}]`;
  
  let ticket;
  if (existingTicket && existingTicket.status !== TicketStatus.CLOSED) {
    ticket = existingTicket;
    await ticketService.updateLastInteraction(ticket.id);
  } else {
    ticket = await ticketService.createTicket({
      contactNumber: message.from,
    });
  }

  let mediaId: string | undefined;
  let mediaUrl: string | undefined;
  let originalMediaUrl: string | undefined;

  if (message.hasMedia) {
    if (message.media && typeof message.media === 'object' && 'url' in message.media) {
      originalMediaUrl = (message.media as { url?: string; mediaUrl?: string }).url || 
                         (message.media as { url?: string; mediaUrl?: string }).mediaUrl || 
                         undefined;
    }
    
    if (!originalMediaUrl && message.mediaUrl) {
      originalMediaUrl = message.mediaUrl;
    }
    
    if (!originalMediaUrl && message._data?.Message) {
      if (message._data.Message.audioMessage?.url) {
        originalMediaUrl = message._data.Message.audioMessage.url;
      } else if (message._data.Message.voiceMessage?.url) {
        originalMediaUrl = message._data.Message.voiceMessage.url;
      } else if (message._data.Message.ptt?.url) {
        originalMediaUrl = message._data.Message.ptt.url;
      }
    }

    if (!originalMediaUrl && message.id) {
      const apiMediaUrl = await wahaService.getMediaUrl(message.id);
      if (apiMediaUrl) {
        originalMediaUrl = apiMediaUrl;
      }
    }

    if (originalMediaUrl) {
      try {
        const mimetype = message.mimetype || 'application/octet-stream';
        const filename = originalMediaUrl.split('/').pop() || `media_${Date.now()}`;
        
        const media = await mediaService.downloadAndStoreMedia(
          ticket.id,
          '', 
          originalMediaUrl,
          filename,
          mimetype
        );
        
        mediaId = media.id;
        const backendPublicUrl = process.env.BACKEND_PUBLIC_URL || 'http://backend:3001';
        mediaUrl = `${backendPublicUrl}/api/media/${media.id}`;
      } catch (error) {
        console.error('Error downloading and storing media:', error);
        const backendPublicUrl = process.env.BACKEND_PUBLIC_URL || 'http://backend:3001';
        const filename = originalMediaUrl.split('/').pop() || '';
        mediaUrl = `${backendPublicUrl}/api/media/${filename}`;
      }
    }
  }

  const savedMessage = await messageService.createMessage({
    ticketId: ticket.id,
    contactNumber: message.from,
    direction: MessageDirection.INBOUND,
    messageType: messageType,
    content: messageText,
    mediaId: mediaId,
    wahaMessageId: message.id,
    isAiGenerated: false,
  });

  if (mediaId && savedMessage.id) {
    await mediaService.db.query(`
      UPDATE media SET message_id = $1 WHERE id = $2
    `, [savedMessage.id, mediaId]);
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

    console.log(`Enviando para n8n ticket ${ticket.id}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('404') || errorMessage.includes('not registered')) {
      console.error(`Webhook n8n não encontrado. Verifique se o workflow está ATIVO no n8n. Ticket ${ticket.id} não enviado.`);
    } else {
      console.error(`Erro ao enviar ticket ${ticket.id} para n8n:`, errorMessage);
    }
  }
}

