import { Router, Request, Response } from 'express';
import { TicketService } from '../services/ticket-service';

export const createTicketsRouter = (ticketService: TicketService): Router => {
  const router = Router();

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const ticket = await ticketService.getTicket(id);

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      res.json(ticket);
    } catch (error) {
      console.error('Error getting ticket:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

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

  router.get('/contact/:contactNumber', async (req: Request, res: Response) => {
    try {
      const { contactNumber } = req.params;
      const ticket = await ticketService.getTicketByContact(contactNumber);

      if (!ticket) {
        return res.status(404).json({ error: 'No active ticket found for this contact' });
      }

      res.json(ticket);
    } catch (error) {
      console.error('Error getting ticket by contact:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};


