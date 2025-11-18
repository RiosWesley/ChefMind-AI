import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';

export class WhisperService {
  private client: AxiosInstance;
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.WHISPER_API_URL || 'http://whisper:9000';
    
    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 300000,
    });
  }

  async transcribeAudio(audioData: Buffer, mimetype: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('audio_file', audioData, {
        filename: `audio.${this.getExtensionFromMimetype(mimetype)}`,
        contentType: mimetype,
      });
      formData.append('language', 'pt');
      formData.append('response_format', 'text');

      const response = await this.client.post('/asr', formData, {
        headers: formData.getHeaders(),
      });

      if (typeof response.data === 'string') {
        return response.data.trim();
      }

      if (response.data.text) {
        return response.data.text.trim();
      }

      return '';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error transcribing audio:', error.response?.data || error.message);
      } else {
        console.error('Error transcribing audio:', error);
      }
      throw error;
    }
  }

  private getExtensionFromMimetype(mimetype: string): string {
    const mimeMap: Record<string, string> = {
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
      'audio/aac': 'aac',
    };

    return mimeMap[mimetype] || 'ogg';
  }
}

