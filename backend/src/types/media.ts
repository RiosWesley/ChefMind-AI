export interface Media {
  id: string;
  ticketId: string;
  messageId: string;
  filename: string;
  mimetype: string;
  fileSize: number;
  fileData: Buffer;
  originalUrl?: string;
  transcription?: string;
  createdAt: Date;
}

export interface CreateMediaData {
  ticketId: string;
  messageId: string;
  filename: string;
  mimetype: string;
  fileData: Buffer;
  originalUrl?: string;
  transcription?: string;
}

