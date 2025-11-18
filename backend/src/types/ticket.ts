export enum TicketStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export interface Ticket {
  id: string;
  contactNumber: string;
  status: TicketStatus;
  createdAt: Date;
  lastInteractionAt: Date;
  closedAt?: Date;
}

export interface CreateTicketData {
  contactNumber: string;
}


