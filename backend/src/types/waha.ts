export interface WahaMessage {
  id: string;
  from: string;
  to?: string | null;
  body?: string;
  timestamp: number;
  type?: string;
  ack?: number;
  fromMe?: boolean;
  mediaUrl?: string;
  mimetype?: string;
  caption?: string;
  hasMedia?: boolean;
  media?: {
    url?: string;
    mediaUrl?: string;
    mimetype?: string;
    filename?: string;
  };
  _data?: {
    Info?: {
      Type?: string;
      MediaType?: string;
    };
    Message?: {
      audioMessage?: {
        url?: string;
        mimetype?: string;
      };
      voiceMessage?: {
        url?: string;
        mimetype?: string;
      };
      ptt?: {
        url?: string;
        mimetype?: string;
      };
    };
  };
}

export interface WahaWebhookEvent {
  event: string;
  session: string;
  payload: {
    id: string;
    from: string;
    to: string;
    body?: string;
    timestamp: number;
    type: string;
    ack?: number;
    fromMe?: boolean;
    mediaUrl?: string;
    mimetype?: string;
    caption?: string;
  };
}


