import { DatabaseService } from '../services/database-service';
import { TicketService } from '../services/ticket-service';
import { MessageService } from '../services/message-service';
import { MessageDirection } from '../types/message';

describe('MessageService', () => {
  let db: DatabaseService;
  let ticketService: TicketService;
  let messageService: MessageService;
  let ticketId: string;

  beforeAll(async () => {
    db = new DatabaseService();
    await db.initialize();
    ticketService = new TicketService(db);
    messageService = new MessageService(db);
  });

  afterAll(async () => {
    await db.query('DELETE FROM messages');
    await db.query('DELETE FROM tickets');
    await db.close();
  });

  beforeEach(async () => {
    await db.query('DELETE FROM messages');
    await db.query('DELETE FROM tickets');
    
    const ticket = await ticketService.createTicket({
      contactNumber: '5511999999999@c.us',
    });
    ticketId = ticket.id;
  });

  it('should create an inbound message', async () => {
    const message = await messageService.createMessage({
      ticketId,
      contactNumber: '5511999999999@c.us',
      direction: MessageDirection.INBOUND,
      messageType: 'text',
      content: 'Hello, world!',
      isAiGenerated: false,
    });

    expect(message).toBeDefined();
    expect(message.id).toBeDefined();
    expect(message.ticketId).toBe(ticketId);
    expect(message.direction).toBe(MessageDirection.INBOUND);
    expect(message.content).toBe('Hello, world!');
    expect(message.isAiGenerated).toBe(false);
  });

  it('should create an outbound message with AI flag', async () => {
    const message = await messageService.createMessage({
      ticketId,
      contactNumber: '5511999999999@c.us',
      direction: MessageDirection.OUTBOUND,
      messageType: 'text',
      content: 'Hello, how can I help?',
      isAiGenerated: true,
    });

    expect(message.direction).toBe(MessageDirection.OUTBOUND);
    expect(message.isAiGenerated).toBe(true);
  });

  it('should get messages by ticket', async () => {
    await messageService.createMessage({
      ticketId,
      contactNumber: '5511999999999@c.us',
      direction: MessageDirection.INBOUND,
      messageType: 'text',
      content: 'Message 1',
    });

    await messageService.createMessage({
      ticketId,
      contactNumber: '5511999999999@c.us',
      direction: MessageDirection.OUTBOUND,
      messageType: 'text',
      content: 'Message 2',
      isAiGenerated: true,
    });

    const messages = await messageService.getMessagesByTicket(ticketId);

    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe('Message 1');
    expect(messages[1].content).toBe('Message 2');
  });

  it('should get messages by contact number', async () => {
    await messageService.createMessage({
      ticketId,
      contactNumber: '5511999999999@c.us',
      direction: MessageDirection.INBOUND,
      messageType: 'text',
      content: 'Test message',
    });

    const messages = await messageService.getMessagesByContact('5511999999999@c.us');

    expect(messages).toHaveLength(1);
    expect(messages[0].contactNumber).toBe('5511999999999@c.us');
  });

  it('should get message by id', async () => {
    const created = await messageService.createMessage({
      ticketId,
      contactNumber: '5511999999999@c.us',
      direction: MessageDirection.INBOUND,
      messageType: 'text',
      content: 'Test message',
    });

    const message = await messageService.getMessage(created.id);

    expect(message).toBeDefined();
    expect(message?.id).toBe(created.id);
    expect(message?.content).toBe('Test message');
  });

  it('should store media_id when provided', async () => {
    const mediaId = '123e4567-e89b-12d3-a456-426614174000';
    const message = await messageService.createMessage({
      ticketId,
      contactNumber: '5511999999999@c.us',
      direction: MessageDirection.INBOUND,
      messageType: 'image',
      content: 'Image message',
      mediaId,
    });

    expect(message.mediaId).toBe(mediaId);
  });
});

