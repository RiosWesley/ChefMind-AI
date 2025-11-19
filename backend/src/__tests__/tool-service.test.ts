import { DatabaseService } from '../services/database-service';
import { TicketService } from '../services/ticket-service';
import { ToolService } from '../services/tool-service';

describe('ToolService', () => {
  let db: DatabaseService;
  let ticketService: TicketService;
  let toolService: ToolService;
  let ticketId: string;

  beforeAll(async () => {
    db = new DatabaseService();
    await db.initialize();
    ticketService = new TicketService(db);
    toolService = new ToolService(ticketService);
  });

  afterAll(async () => {
    await db.query('DELETE FROM messages');
    await db.query('DELETE FROM media');
    await db.query('DELETE FROM tickets');
    await db.close();
  });

  beforeEach(async () => {
    await db.query('DELETE FROM messages');
    await db.query('DELETE FROM media');
    await db.query('DELETE FROM tickets');
    
    const ticket = await ticketService.createTicket({
      contactNumber: '5511999999999@c.us',
    });
    ticketId = ticket.id;
  });

  it('should return available tools', () => {
    const tools = toolService.getAvailableTools();
    
    expect(tools).toBeDefined();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    
    const closeTicketTool = tools.find(t => t.name === 'close_ticket');
    expect(closeTicketTool).toBeDefined();
    expect(closeTicketTool?.description).toBeDefined();
    expect(closeTicketTool?.parameters).toBeDefined();
  });

  it('should execute close_ticket tool successfully', async () => {
    const result = await toolService.executeTool({
      tool: 'close_ticket',
      parameters: {
        ticketId,
      },
    });

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect((result.result as any).ticketId).toBe(ticketId);

    const ticket = await ticketService.getTicket(ticketId);
    expect(ticket?.status).toBe('closed');
  });

  it('should return error for invalid tool', async () => {
    const result = await toolService.executeTool({
      tool: 'invalid_tool',
      parameters: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('not found');
  });

  it('should return error for missing ticketId', async () => {
    const result = await toolService.executeTool({
      tool: 'close_ticket',
      parameters: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('ticketId');
  });

  it('should return error for non-existent ticket', async () => {
    const result = await toolService.executeTool({
      tool: 'close_ticket',
      parameters: {
        ticketId: '00000000-0000-0000-0000-000000000000',
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('not found');
  });
});




