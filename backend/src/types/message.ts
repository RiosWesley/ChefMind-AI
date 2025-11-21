export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export interface Message {
  id: string;
  ticketId: string;
  contactNumber: string;
  direction: MessageDirection;
  messageType: string;
  content: string;
  mediaId?: string;
  wahaMessageId?: string;
  isAiGenerated: boolean;
  createdAt: Date;
}

export interface CreateMessageData {
  ticketId: string;
  contactNumber: string;
  direction: MessageDirection;
  messageType: string;
  content: string;
  mediaId?: string;
  wahaMessageId?: string;
  isAiGenerated?: boolean;
}







