import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { DatabaseService } from './database-service';
import { Media, CreateMediaData } from '../types/media';
import { WhisperService } from './whisper-service';

export class MediaService {
  public db: DatabaseService;
  private whisperService: WhisperService;
  private wahaApiUrl: string;
  private wahaApiKey: string;

  constructor(db: DatabaseService, whisperService: WhisperService) {
    this.db = db;
    this.whisperService = whisperService;
    this.wahaApiUrl = process.env.WAHA_API_URL || 'http://waha:3000';
    this.wahaApiKey = process.env.WAHA_API_KEY || '';
  }

  async downloadAndStoreMedia(
    ticketId: string,
    messageId: string,
    mediaUrl: string,
    filename: string,
    mimetype: string
  ): Promise<Media> {
    const wahaApiUrl = process.env.WAHA_API_URL || 'http://waha:3000';
    const fullUrl = mediaUrl.startsWith('http') ? mediaUrl : `${wahaApiUrl}${mediaUrl}`;
    
    try {
      const response = await axios.get(fullUrl, {
        headers: {
          'X-Api-Key': this.wahaApiKey,
        },
        responseType: 'arraybuffer',
      });

      const fileData = Buffer.from(response.data);
      const fileSize = fileData.length;

      let transcription: string | undefined;

      if (mimetype.startsWith('audio/')) {
        try {
          transcription = await this.whisperService.transcribeAudio(fileData, mimetype);
        } catch (error) {
          console.error('Error transcribing audio:', error);
        }
      }

      const mediaData: CreateMediaData = {
        ticketId,
        messageId: messageId || '',
        filename,
        mimetype,
        fileData,
        originalUrl: mediaUrl,
        transcription,
      };

      return this.createMedia(mediaData);
    } catch (error) {
      console.error('Error downloading media:', error);
      throw error;
    }
  }

  async createMedia(data: CreateMediaData): Promise<Media> {
    const id = uuidv4();
    const result = await this.db.query(`
      INSERT INTO media (
        id, ticket_id, message_id, filename, mimetype, 
        file_size, file_data, original_url, transcription, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id, ticket_id, message_id, filename, mimetype, 
                file_size, file_data, original_url, transcription, created_at
    `, [
      id,
      data.ticketId,
      data.messageId,
      data.filename,
      data.mimetype,
      data.fileData.length,
      data.fileData,
      data.originalUrl || null,
      data.transcription || null,
    ]);

    return this.mapRowToMedia(result.rows[0]);
  }

  async getMedia(id: string): Promise<Media | null> {
    const result = await this.db.query(`
      SELECT id, ticket_id, message_id, filename, mimetype, 
             file_size, file_data, original_url, transcription, created_at
      FROM media
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMedia(result.rows[0]);
  }

  async getMediaByMessage(messageId: string): Promise<Media | null> {
    const result = await this.db.query(`
      SELECT id, ticket_id, message_id, filename, mimetype, 
             file_size, file_data, original_url, transcription, created_at
      FROM media
      WHERE message_id = $1
      LIMIT 1
    `, [messageId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMedia(result.rows[0]);
  }

  private mapRowToMedia(row: {
    id: string;
    ticket_id: string;
    message_id: string;
    filename: string;
    mimetype: string;
    file_size: number | string;
    file_data: Buffer;
    original_url: string | null;
    transcription: string | null;
    created_at: Date;
  }): Media {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      messageId: row.message_id,
      filename: row.filename,
      mimetype: row.mimetype,
      fileSize: typeof row.file_size === 'string' ? parseInt(row.file_size) : row.file_size,
      fileData: row.file_data,
      originalUrl: row.original_url || undefined,
      transcription: row.transcription || undefined,
      createdAt: new Date(row.created_at),
    };
  }
}

