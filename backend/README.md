# Backend WAHA Ticket Manager

Backend em Node.js/TypeScript que gerencia mensagens do WAHA como tickets e integra com n8n.

## Funcionalidades

- Recebe mensagens do WAHA via webhook (texto, imagens, vídeos, áudios, documentos)
- Cria tickets com UUID para cada mensagem recebida
- Envia dados do ticket imediatamente para webhook do n8n
- Suporta mídias (fotos, vídeos, áudios) - URLs são enviadas no payload
- Fechamento automático de tickets após 15 minutos de inatividade
- Rotas HTTP para o n8n gerenciar tickets

## Armazenamento de Mídias

As mídias (fotos, vídeos, áudios) são armazenadas pelo WAHA no volume Docker `waha_media`, mapeado para `/app/.media` dentro do container do WAHA. O backend recebe a URL da mídia no webhook e a envia para o n8n no payload.

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com:

```env
WAHA_API_URL=http://waha:3000
WAHA_API_KEY=zapsexy
N8N_WEBHOOK_URL=http://n8n:5678/webhook/tickets
PORT=3001
REDIS_URL=redis://default:default@redis:6379
```

## Rotas

### Webhook (recebe do WAHA)
- `POST /webhook` - Recebe eventos do WAHA

### API de Tickets (chamadas do n8n)
- `GET /api/tickets/:id` - Busca ticket por ID
- `POST /api/tickets/:id/close` - Fecha um ticket
- `GET /api/tickets/contact/:contactNumber` - Busca ticket ativo por número de contato

### Health Check
- `GET /health` - Verifica status do serviço

## Estrutura

```
backend/
├── src/
│   ├── index.ts              # Ponto de entrada
│   ├── server.ts             # Configuração do servidor
│   ├── routes/
│   │   ├── webhook.ts        # Rotas de webhook do WAHA
│   │   └── tickets.ts        # Rotas HTTP para n8n
│   ├── services/
│   │   ├── ticket-service.ts # Gerenciamento de tickets
│   │   └── n8n-service.ts    # Envio para webhook do n8n
│   └── types/
│       ├── ticket.ts         # Tipos de tickets
│       ├── waha.ts           # Tipos do WAHA
│       └── n8n.ts            # Tipos do n8n
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Build e Execução

```bash
# Instalar dependências
npm install

# Compilar TypeScript
npm run build

# Executar
npm start

# Desenvolvimento
npm run dev
```

## Docker

O backend está configurado no `docker-compose.yml` e será construído automaticamente ao executar:

```bash
docker-compose up --build
```


