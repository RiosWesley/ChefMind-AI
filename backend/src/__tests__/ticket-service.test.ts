import { DatabaseService } from '../services/database-service';
import { TicketService } from '../services/ticket-service';
import { TicketStatus } from '../types/ticket';

describe('TicketService', () => {
  let db: DatabaseService;
  let ticketService: TicketService;

  beforeAll(async () => {
    db = new DatabaseService();
    await db.initialize();
    ticketService = new TicketService(db);
  });

  afterAll(async () => {
    await db.query('DELETE FROM tickets');
    await db.close();
  });

  beforeEach(async () => {
    await db.query('DELETE FROM tickets');
  });

  it('should create a ticket', async () => {
    const ticket = await ticketService.createTicket({
      contactNumber: '5511999999999@c.us',
    });

    expect(ticket).toBeDefined();
    expect(ticket.id).toBeDefined();
    expect(ticket.contactNumber).toBe('5511999999999@c.us');
    expect(ticket.status).toBe(TicketStatus.OPEN);
    expect(ticket.createdAt).toBeInstanceOf(Date);
    expect(ticket.lastInteractionAt).toBeInstanceOf(Date);
  });

  it('should get a ticket by id', async () => {
    const created = await ticketService.createTicket({
      contactNumber: '5511999999999@c.us',
    });

    const ticket = await ticketService.getTicket(created.id);

    expect(ticket).toBeDefined();
    expect(ticket?.id).toBe(created.id);
    expect(ticket?.contactNumber).toBe('5511999999999@c.us');
  });

  it('should return null for non-existent ticket', async () => {
    const ticket = await ticketService.getTicket('00000000-0000-0000-0000-000000000000');
    expect(ticket).toBeNull();
  });

  it('should get ticket by contact number', async () => {
    await ticketService.createTicket({
      contactNumber: '5511999999999@c.us',
    });

    const ticket = await ticketService.getTicketByContact('5511999999999@c.us');

    expect(ticket).toBeDefined();
    expect(ticket?.contactNumber).toBe('5511999999999@c.us');
    expect(ticket?.status).toBe(TicketStatus.OPEN);
  });

  it('should close a ticket', async () => {
    const ticket = await ticketService.createTicket({
      contactNumber: '5511999999999@c.us',
    });

    const closed = await ticketService.closeTicket(ticket.id);
    expect(closed).toBe(true);

    const closedTicket = await ticketService.getTicket(ticket.id);
    expect(closedTicket?.status).toBe(TicketStatus.CLOSED);
    expect(closedTicket?.closedAt).toBeDefined();
  });

  it('should update last interaction', async () => {
    const ticket = await ticketService.createTicket({
      contactNumber: '5511999999999@c.us',
    });

    const initialTime = ticket.lastInteractionAt;
    await new Promise(resolve => setTimeout(resolve, 100));
    await ticketService.updateLastInteraction(ticket.id);

    const updated = await ticketService.getTicket(ticket.id);
    expect(updated?.lastInteractionAt.getTime()).toBeGreaterThan(initialTime.getTime());
  });

  it('should not return closed tickets when getting by contact', async () => {
    const ticket = await ticketService.createTicket({
      contactNumber: '5511999999999@c.us',
    });

    await ticketService.closeTicket(ticket.id);

    const activeTicket = await ticketService.getTicketByContact('5511999999999@c.us');
    expect(activeTicket).toBeNull();
  });
});







