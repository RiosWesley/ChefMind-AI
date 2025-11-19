import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WAHA Ticket Manager API',
      version: '1.0.0',
      description: 'API para gerenciamento de tickets do WhatsApp via WAHA, integração com n8n e transcrição de áudios com Whisper',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'http://backend:3001',
        description: 'Docker internal server',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Tickets',
        description: 'Gerenciamento de tickets',
      },
      {
        name: 'Messages',
        description: 'Envio e recebimento de mensagens',
      },
      {
        name: 'Media',
        description: 'Acesso a mídias armazenadas',
      },
      {
        name: 'Tools',
        description: 'Ferramentas disponíveis para IA',
      },
      {
        name: 'Webhook',
        description: 'Webhook para receber eventos do WAHA',
      },
    ],
    components: {
      schemas: {
        Ticket: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Identificador único do ticket',
            },
            contactNumber: {
              type: 'string',
              description: 'Número do contato no formato WhatsApp',
              example: '5511999999999@lid',
            },
            sessionName: {
              type: 'string',
              description: 'Nome da sessão do WAHA',
              example: 'default',
            },
            status: {
              type: 'string',
              enum: ['open', 'closed'],
              description: 'Status do ticket',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação',
            },
            lastInteractionAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data da última interação',
            },
            closedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Data de fechamento',
            },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Identificador único da mensagem',
            },
            ticketId: {
              type: 'string',
              format: 'uuid',
              description: 'ID do ticket associado',
            },
            contactNumber: {
              type: 'string',
              description: 'Número do contato',
            },
            direction: {
              type: 'string',
              enum: ['inbound', 'outbound'],
              description: 'Direção da mensagem',
            },
            messageType: {
              type: 'string',
              enum: ['text', 'audio', 'image', 'video', 'document'],
              description: 'Tipo da mensagem',
            },
            content: {
              type: 'string',
              description: 'Conteúdo da mensagem ou transcrição',
            },
            mediaId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'ID da mídia associada',
            },
            wahaMessageId: {
              type: 'string',
              nullable: true,
              description: 'ID da mensagem no WAHA',
            },
            isAiGenerated: {
              type: 'boolean',
              description: 'Indica se a mensagem foi gerada por IA',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação',
            },
          },
        },
        Tool: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Nome da ferramenta',
            },
            description: {
              type: 'string',
              description: 'Descrição da ferramenta',
            },
            parameters: {
              type: 'object',
              description: 'Parâmetros da ferramenta',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensagem de erro',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/server.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'WAHA Ticket Manager API',
  }));
};




