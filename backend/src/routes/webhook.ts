import { Router, Request, Response } from 'express';
import { WahaWebhookEvent, WahaMessage } from '../types/waha';
import { TicketService } from '../services/ticket-service';
import { WahaService } from '../services/waha-service';
import { N8nService } from '../services/n8n-service';
import { TicketStatus } from '../types/ticket';

export const createWebhookRouter = (
  ticketService: TicketService,
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
        await handleNewMessage(normalizedMessage, ticketService, wahaService, n8nService);
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
  wahaService: WahaService,
  n8nService: N8nService
): Promise<void> {
  const existingTicket = await ticketService.getTicketByContact(message.from);

  const messageType = normalizeMessageType(message);
  const messageText = message.body || message.caption || `[${messageType}]`;
  let mediaUrl = message.mediaUrl || undefined;
  
  if (message.hasMedia) {
    if (message.media && typeof message.media === 'object' && 'url' in message.media) {
      let extractedUrl = (message.media as { url?: string; mediaUrl?: string }).url || 
                         (message.media as { url?: string; mediaUrl?: string }).mediaUrl || 
                         undefined;
      
      if (extractedUrl) {
        mediaUrl = normalizeMediaUrl(extractedUrl, wahaService);
        console.log('Media URL extraída de message.media:', mediaUrl);
      }
    }
    
    if (!mediaUrl && message.mediaUrl) {
      mediaUrl = normalizeMediaUrl(message.mediaUrl, wahaService);
      console.log('Media URL extraída de message.mediaUrl:', mediaUrl);
    }
    
    if (!mediaUrl && message._data?.Message) {
      if (message._data.Message.audioMessage?.url) {
        mediaUrl = normalizeMediaUrl(message._data.Message.audioMessage.url, wahaService);
        console.log('Media URL extraída de audioMessage:', mediaUrl);
      } else if (message._data.Message.voiceMessage?.url) {
        mediaUrl = normalizeMediaUrl(message._data.Message.voiceMessage.url, wahaService);
        console.log('Media URL extraída de voiceMessage:', mediaUrl);
      } else if (message._data.Message.ptt?.url) {
        mediaUrl = normalizeMediaUrl(message._data.Message.ptt.url, wahaService);
        console.log('Media URL extraída de ptt:', mediaUrl);
      }
    }

    if (!mediaUrl && message.id) {
      console.log('Tentando obter URL de mídia via API do WAHA para messageId:', message.id);
      const apiMediaUrl = await wahaService.getMediaUrl(message.id);
      if (apiMediaUrl) {
        mediaUrl = normalizeMediaUrl(apiMediaUrl, wahaService);
        console.log('Media URL obtida via API do WAHA:', mediaUrl);
      }
    }

    if (!mediaUrl) {
      console.log('AVISO: Mensagem com mídia mas sem URL encontrada. Payload:', JSON.stringify({
        hasMedia: message.hasMedia,
        mediaUrl: message.mediaUrl,
        media: message.media,
        messageId: message.id,
        _dataMessage: message._data?.Message ? Object.keys(message._data.Message) : null,
        _dataInfo: message._data?.Info,
      }, null, 2));
    }
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

