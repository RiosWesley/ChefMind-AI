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

  /**
   * @swagger
   * /api/messages:
   *   post:
   *     summary: Envia uma mensagem para o WhatsApp
   *     description: Envia uma mensagem para o contato associado ao ticket. O sessionName é gerenciado automaticamente.
   *     tags: [Messages]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - ticketId
   *               - message
   *             properties:
   *               ticketId:
   *                 type: string
   *                 format: uuid
   *                 description: ID do ticket
   *               message:
   *                 type: string
   *                 description: Texto da mensagem a ser enviada
   *               mediaUrl:
   *                 type: string
   *                 format: uri
   *                 description: URL da mídia (opcional)
   *     responses:
   *       200:
   *         description: Mensagem enviada com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: Campos obrigatórios faltando
   *       404:
   *         description: Ticket não encontrado
   */
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

      await wahaService.sendMessage(ticket.contactNumber, message, ticket.sessionName);

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

