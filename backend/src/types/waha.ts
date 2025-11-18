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
  media?: any;
  _data?: {
    Info?: {
      Type?: string;
      MediaType?: string;
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


