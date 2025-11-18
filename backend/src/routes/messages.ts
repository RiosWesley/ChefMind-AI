import { Router, Request, Response } from 'express';
import { TicketService } from '../services/ticket-service';
import { MessageService } from '../services/message-service';
import { WahaService } from '../services/waha-service';
import { MessageDirection } from '../types/message';

export const createMessagesRouter = (
  ticketService: TicketService,
  messageService: MessageService,
  wahaService: WahaService
): Router => {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    try {
      const { ticketId, message, mediaUrl } = req.body;

      if (!ticketId || !message) {
        return res.status(400).json({ error: 'ticketId and message are required' });
      }

      const ticket = await ticketService.getTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      await wahaService.sendMessage(ticket.contactNumber, message);

      await messageService.createMessage({
        ticketId: ticket.id,
        contactNumber: ticket.contactNumber,
        direction: MessageDirection.OUTBOUND,
        messageType: 'text',
        content: message,
        isAiGenerated: true,
      });

      await ticketService.updateLastInteraction(ticket.id);

      res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

