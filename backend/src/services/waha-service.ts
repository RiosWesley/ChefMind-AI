import axios, { AxiosInstance } from 'axios';

export class WahaService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    const apiUrl = process.env.WAHA_API_URL || 'http://waha:3000';
    this.apiKey = process.env.WAHA_API_KEY || '';

    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(chatId: string, message: string, sessionName: string = 'default'): Promise<void> {
    try {
      const response = await this.client.post('/api/sendText', {
        session: sessionName,
        chatId,
        text: message,
      });
      console.log('Message sent successfully:', response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error sending message:', error.response?.data || error.message);
        throw new Error(`Failed to send message: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async getMediaUrl(messageId: string): Promise<string | null> {
    try {
      const response = await this.client.get(`/api/downloadMedia/${messageId}`);
      if (response.data && response.data.url) {
        return response.data.url;
      }
      return null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error getting media URL:', error.response?.data || error.message);
      }
      return null;
    }
  }

  async downloadMedia(messageId: string): Promise<Buffer | null> {
    try {
      const response = await this.client.get(`/api/downloadMedia/${messageId}`, {
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error downloading media:', error.response?.data || error.message);
      }
      return null;
    }
  }
}


