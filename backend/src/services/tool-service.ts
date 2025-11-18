import { TicketService } from './ticket-service';
import { Tool, ToolExecution, ToolResult } from '../types/tool';

export class ToolService {
  private ticketService: TicketService;

  constructor(ticketService: TicketService) {
    this.ticketService = ticketService;
  }

  getAvailableTools(): Tool[] {
    return [
      {
        name: 'close_ticket',
        description: 'Fecha um ticket específico. Use quando o atendimento for concluído ou quando o usuário não responder mais.',
        parameters: {
          type: 'object',
          properties: {
            ticketId: {
              type: 'string',
              description: 'O ID do ticket que deve ser fechado',
            },
          },
          required: ['ticketId'],
        },
      },
    ];
  }

  async executeTool(execution: ToolExecution): Promise<ToolResult> {
    try {
      switch (execution.tool) {
        case 'close_ticket':
          return await this.executeCloseTicket(execution.parameters);
        
        default:
          return {
            success: false,
            error: `Tool '${execution.tool}' not found`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async executeCloseTicket(parameters: Record<string, unknown>): Promise<ToolResult> {
    const ticketId = parameters.ticketId;

    if (!ticketId || typeof ticketId !== 'string') {
      return {
        success: false,
        error: 'ticketId is required and must be a string',
      };
    }

    const closed = await this.ticketService.closeTicket(ticketId);

    if (!closed) {
      return {
        success: false,
        error: `Ticket with id '${ticketId}' not found`,
      };
    }

    return {
      success: true,
      result: {
        message: `Ticket ${ticketId} closed successfully`,
        ticketId,
      },
    };
  }
}

