export enum TicketStatus {
  OPEN = 'open',
  SENT_TO_N8N = 'sent_to_n8n',
  CLOSED = 'closed',
}

export interface Ticket {
  id: string;
  contactNumber: string;
  originalMessage: string;
  messageType: string;
  mediaUrl?: string;
  status: TicketStatus;
  createdAt: Date;
  lastInteractionAt: Date;
}

export interface CreateTicketData {
  contactNumber: string;
  originalMessage: string;
  messageType: string;
  mediaUrl?: string;
}


