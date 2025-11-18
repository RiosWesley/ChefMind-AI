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

  async sendMessage(chatId: string, message: string): Promise<void> {
    try {
      const response = await this.client.post('/api/sendText', {
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
}


