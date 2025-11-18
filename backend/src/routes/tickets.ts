import { Router, Request, Response } from 'express';
import { TicketService } from '../services/ticket-service';
import { MessageService } from '../services/message-service';
import { MediaService } from '../services/media-service';

export const createTicketsRouter = (
  ticketService: TicketService,
  messageService: MessageService,
  mediaService: MediaService
): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/tickets/{id}:
   *   get:
   *     summary: Busca um ticket por ID
   *     tags: [Tickets]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID do ticket
   *     responses:
   *       200:
   *         description: Ticket encontrado com suas mensagens
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/Ticket'
   *                 - type: object
   *                   properties:
   *                     messages:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Message'
   *       404:
   *         description: Ticket não encontrado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const ticket = await ticketService.getTicket(id);

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const messages = await messageService.getMessagesByTicket(id);

      res.json({
        ...ticket,
        messages,
      });
    } catch (error) {
      console.error('Error getting ticket:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/tickets/{id}/messages:
   *   get:
   *     summary: Busca todas as mensagens de um ticket
   *     tags: [Tickets]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID do ticket
   *     responses:
   *       200:
   *         description: Lista de mensagens do ticket
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Message'
   */
  router.get('/:id/messages', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const messages = await messageService.getMessagesByTicket(id);

      res.json(messages);
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/tickets/{id}/close:
   *   post:
   *     summary: Fecha um ticket
   *     tags: [Tickets]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID do ticket
   *     responses:
   *       200:
   *         description: Ticket fechado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       404:
   *         description: Ticket não encontrado
   */
  router.post('/:id/close', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const closed = await ticketService.closeTicket(id);

      if (!closed) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      res.json({ success: true, message: 'Ticket closed successfully' });
    } catch (error) {
      console.error('Error closing ticket:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/tickets/contact/{contactNumber}:
   *   get:
   *     summary: Busca ticket ativo por número de contato
   *     tags: [Tickets]
   *     parameters:
   *       - in: path
   *         name: contactNumber
   *         required: true
   *         schema:
   *           type: string
   *         description: Número do contato (ex: 5511999999999@lid)
   *     responses:
   *       200:
   *         description: Ticket encontrado com suas mensagens
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/Ticket'
   *                 - type: object
   *                   properties:
   *                     messages:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Message'
   *       404:
   *         description: Nenhum ticket ativo encontrado
   */
  router.get('/contact/:contactNumber', async (req: Request, res: Response) => {
    try {
      const { contactNumber } = req.params;
      const ticket = await ticketService.getTicketByContact(contactNumber);

      if (!ticket) {
        return res.status(404).json({ error: 'No active ticket found for this contact' });
      }

      const messages = await messageService.getMessagesByContact(contactNumber);

      res.json({
        ...ticket,
        messages,
      });
    } catch (error) {
      console.error('Error getting ticket by contact:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};


