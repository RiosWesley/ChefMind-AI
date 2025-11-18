import axios, { AxiosInstance } from 'axios';
import { N8nWebhookPayload } from '../types/n8n';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class N8nService {
  private client: AxiosInstance;
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.N8N_WEBHOOK_URL || '';
    
    if (!this.webhookUrl) {
      console.warn('N8N_WEBHOOK_URL is not configured');
    } else {
      console.log(`N8N Webhook URL configured: ${this.webhookUrl}`);
    }

    this.client = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async sendTicketData(payload: N8nWebhookPayload): Promise<void> {
    if (!this.webhookUrl) {
      throw new Error('N8N_WEBHOOK_URL is not configured');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.client.post(this.webhookUrl, payload);
        return;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorMessage = error.response?.data 
            ? JSON.stringify(error.response.data)
            : error.message;
          const statusCode = error.response?.status;
          const statusText = error.response?.statusText;
          
          lastError = new Error(
            `Failed to send data to n8n (attempt ${attempt}/${MAX_RETRIES}): ${statusCode ? `${statusCode} ${statusText}` : ''} ${errorMessage}`
          );
          
          if (attempt === MAX_RETRIES) {
            console.error(`Error details: URL=${this.webhookUrl}, Status=${statusCode}, Response=`, error.response?.data);
          }
        } else {
          const errorMessage = error instanceof Error ? error.message : String(error);
          lastError = new Error(
            `Failed to send data to n8n (attempt ${attempt}/${MAX_RETRIES}): ${errorMessage}`
          );
        }

        if (attempt < MAX_RETRIES) {
          await this.delay(RETRY_DELAY_MS * attempt);
        }
      }
    }

    throw lastError || new Error('Failed to send data to n8n after retries');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}


