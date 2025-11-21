# Testes

Este documento descreve como executar os testes do projeto.

## Pré-requisitos

1. Banco de dados PostgreSQL rodando (pode ser via Docker Compose)
2. Variáveis de ambiente configuradas (ou usar `.env.test`)

## Configuração

Crie um arquivo `.env.test` na raiz do projeto `backend/` com as configurações de teste:

```env
DATABASE_URL=postgresql://default:default@localhost:5432/test_db
WAHA_API_URL=http://localhost:3000
WAHA_API_KEY=test-key
WHISPER_API_URL=http://localhost:9000
N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

## Executando os Testes

### Todos os testes
```bash
npm test
```

### Modo watch (re-executa ao salvar arquivos)
```bash
npm run test:watch
```

### Com cobertura de código
```bash
npm run test:coverage
```

## Estrutura dos Testes

### `database-service.test.ts`
- Testa a inicialização do banco de dados
- Verifica criação de tabelas (tickets, messages, media)
- Valida estrutura das tabelas

### `ticket-service.test.ts`
- Testa criação de tickets
- Testa busca de tickets por ID e contato
- Testa fechamento de tickets
- Testa atualização de última interação
- Testa filtro de tickets fechados

### `message-service.test.ts`
- Testa criação de mensagens (inbound e outbound)
- Testa flag `is_ai_generated`
- Testa busca de mensagens por ticket e contato
- Testa associação de mídias

### `routes.test.ts`
- Testa endpoints da API
- Testa webhook do WAHA
- Testa rotas de tickets
- Testa rota de envio de mensagens

## Notas

- Os testes limpam o banco antes de cada execução
- Certifique-se de usar um banco de dados de teste separado
- Os testes não dependem de serviços externos (WAHA, Whisper, n8n) estarem rodando







