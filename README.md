# Sistema de Tickets WhatsApp com WAHA

Sistema completo de gerenciamento de tickets para WhatsApp que integra WAHA, n8n e Whisper para transcrever áudios. Todas as mensagens e mídias são armazenadas no PostgreSQL para consulta e análise.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Funcionalidades](#funcionalidades)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Como Iniciar](#como-iniciar)
- [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
- [API Endpoints](#api-endpoints)
- [Documentação da API](#documentação-da-api)
- [Fluxo de Dados](#fluxo-de-dados)
- [Testes](#testes)
- [Troubleshooting](#troubleshooting)

## 🎯 Visão Geral

Este sistema permite:

- Receber mensagens do WhatsApp via WAHA
- Criar tickets automaticamente para cada conversa
- Armazenar todas as mensagens e mídias no PostgreSQL
- Transcrever áudios automaticamente usando Whisper
- Enviar dados para n8n para processamento com IA
- Enviar respostas de volta para o WhatsApp
- Fechar tickets automaticamente após 15 minutos de inatividade
- Documentação interativa da API com Swagger
- Documentação otimizada para LLMs em `/llm.txt`

## 🏗️ Arquitetura

```
┌─────────┐      ┌──────────┐      ┌─────────┐      ┌──────┐
│  WAHA   │─────▶│ Backend  │─────▶│   n8n   │      │Postgres│
│(WhatsApp)│     │ (Node.js)│      │  (IA)   │      │        │
└─────────┘      └──────────┘      └────┬────┘      └────────┘
      ▲                │                  │                │
      │                │                  │                │
      │                ▼                  │                │
      │          ┌──────────┐            │                │
      └──────────│ Whisper  │            │                │
                 │(Transcrição)          │                │
                 └──────────┘            │                │
                                         │                │
                                         └────────────────┘
```

### Componentes

- **WAHA**: API HTTP para WhatsApp (recebe e envia mensagens)
- **Backend**: Serviço Node.js/TypeScript que gerencia tickets e integra todos os componentes
- **PostgreSQL**: Banco de dados para armazenar tickets, mensagens e mídias
- **n8n**: Plataforma de automação para processar mensagens com IA
- **Whisper**: Serviço de transcrição de áudios (OpenAI Whisper)
- **Redis**: (Opcional) Pode ser usado para cache

## ✨ Funcionalidades

### Gerenciamento de Tickets
- Criação automática de tickets para cada contato
- Armazenamento automático do session name do WAHA
- Fechamento automático após 15 minutos de inatividade
- Fechamento manual via API
- Busca de tickets por ID ou número de contato

### Armazenamento de Mensagens
- Todas as mensagens (entrada e saída) são salvas no banco
- Suporte a texto, imagens, vídeos, áudios e documentos
- Histórico completo de conversas por ticket
- Identificação de mensagens enviadas por IA (`is_ai_generated`)

### Armazenamento de Mídias
- Download automático de mídias do WAHA
- Armazenamento em BYTEA no PostgreSQL
- URLs normalizadas para acesso via proxy do backend
- Transcrição automática de áudios via Whisper

### Integração com n8n
- Envio automático de novas mensagens para webhook do n8n
- Recebimento de respostas do n8n para enviar ao WhatsApp
- Payload completo com ticketId, mensagem, tipo e URL de mídia
- Session name gerenciado automaticamente pelo backend

## 📦 Pré-requisitos

### Software Necessário

- **Docker** (versão 20.10 ou superior)
- **Docker Compose** (versão 2.0 ou superior)
- **Node.js** (versão 20 ou superior) - apenas para desenvolvimento local
- **NVIDIA GPU** (opcional, mas recomendado para Whisper) - apenas se usar GPU

### Verificar Instalação

```bash
docker --version
docker compose version
```

### Para GPU (Opcional)

Se quiser usar GPU para transcrição de áudios:

1. Instale o [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
2. Verifique se está funcionando:
   ```bash
   docker run --rm --gpus all nvidia/cuda:11.0.3-base-ubuntu20.04 nvidia-smi
   ```

## 🚀 Instalação

### 1. Clone o Repositório

```bash
git clone <url-do-repositorio>
cd ChatbotIgreja
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (opcional, as variáveis podem ser definidas no docker-compose.yml):

```env
# Webhook do n8n (ajuste conforme necessário)
N8N_WEBHOOK_URL=http://host.docker.internal:5678/webhook-test/test
```

### 3. Configurar Whisper (CPU ou GPU)

**Para CPU** (mais lento, mas funciona sem GPU):
Edite `docker-compose.yml` e altere o serviço `whisper`:

```yaml
whisper:
  image: onerahmet/openai-whisper-asr-webservice:latest  # Sem -gpu
  platform: linux/amd64
  environment:
    ASR_MODEL: base
    ASR_ENGINE: openai_whisper
    ASR_LANGUAGE: pt
    ASR_DEVICE: cpu  # Mude para cpu
  ports:
    - "9000:9000"
  # Remova a seção deploy se usar CPU
```

**Para GPU** (mais rápido, requer NVIDIA GPU):
O `docker-compose.yml` já está configurado para GPU. Certifique-se de ter o NVIDIA Container Toolkit instalado.

### 4. Construir e Iniciar os Serviços

```bash
docker compose up -d --build
```

Este comando irá:
- Construir a imagem do backend
- Baixar as imagens necessárias (WAHA, PostgreSQL, n8n, Whisper)
- Criar os volumes para persistência
- Iniciar todos os serviços

### 5. Verificar se Está Funcionando

```bash
# Ver logs de todos os serviços
docker compose logs -f

# Ver logs de um serviço específico
docker compose logs -f backend
docker compose logs -f postgres
docker compose logs -f waha

# Verificar status dos containers
docker compose ps
```

## ⚙️ Configuração

### Variáveis de Ambiente do Backend

As variáveis são configuradas no `docker-compose.yml`:

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `WAHA_API_URL` | URL da API do WAHA | `http://waha:3000` |
| `WAHA_API_KEY` | Chave de API do WAHA | `zapsexy` |
| `N8N_WEBHOOK_URL` | URL do webhook do n8n | `http://host.docker.internal:5678/webhook-test/test` |
| `PORT` | Porta do backend | `3001` |
| `DATABASE_URL` | URL de conexão do PostgreSQL | `postgresql://default:default@postgres:5432/default` |
| `WHISPER_API_URL` | URL da API do Whisper | `http://whisper:9000` |
| `BACKEND_PUBLIC_URL` | URL pública do backend (para mídias) | `http://backend:3001` |

## 🎬 Como Iniciar

### 1. Iniciar Todos os Serviços

```bash
docker compose up -d
```

Aguarde alguns segundos para todos os serviços iniciarem. Você pode verificar o status com:

```bash
docker compose ps
```

### 2. Acessar e Configurar o n8n

1. **Acesse o n8n:**
   - Abra seu navegador em: http://localhost:5678
   - Faça login ou crie uma conta (primeira vez)

2. **Importar o Workflow:**
   - No n8n, clique em **"Workflows"** no menu lateral
   - Clique em **"Import from File"** ou use o botão **"+"** e selecione **"Import from File"**
   - Selecione o arquivo do workflow (se houver um arquivo `.json` no projeto)
   - Ou crie um novo workflow manualmente seguindo a estrutura abaixo

3. **Ativar o Workflow:**
   - **IMPORTANTE:** Após importar/criar o workflow, ative-o usando o toggle no canto superior direito
   - O workflow só receberá mensagens quando estiver ativo

### 3. Conectar o WhatsApp (WAHA)

1. **Acesse o Dashboard do WAHA:**
   - Abra: http://localhost:3000
   - Faça login com as credenciais configuradas (padrão: `admin` / `12345678`)

2. **Conectar WhatsApp:**
   - Escaneie o QR Code com seu WhatsApp
   - Aguarde a conexão ser estabelecida

### 4. Testar o Sistema

Envie uma mensagem para o número conectado no WhatsApp. O sistema deve:
- Criar um ticket automaticamente
- Enviar a mensagem para o n8n
- Processar com IA (se configurado)
- Enviar resposta de volta (se o workflow estiver configurado)

### Parar Todos os Serviços

```bash
docker compose down
```

### Parar e Remover Volumes (⚠️ Apaga dados)

```bash
docker compose down -v
```

### Reiniciar um Serviço Específico

```bash
docker compose restart backend
```

### Ver Logs em Tempo Real

```bash
# Todos os serviços
docker compose logs -f

# Apenas backend
docker compose logs -f backend

# Últimas 100 linhas
docker compose logs --tail=100 backend
```

### Reconstruir Após Mudanças no Código

```bash
docker compose up -d --build backend
```

## 🗄️ Estrutura do Banco de Dados

### Tabela: `tickets`

Armazena os tickets principais.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único do ticket |
| `contact_number` | VARCHAR(255) | Número do contato (índice) |
| `session_name` | VARCHAR(255) | Nome da sessão do WAHA (salvo automaticamente) |
| `status` | ENUM | `open` ou `closed` |
| `created_at` | TIMESTAMP | Data de criação |
| `last_interaction_at` | TIMESTAMP | Última interação |
| `closed_at` | TIMESTAMP | Data de fechamento (nullable) |

### Tabela: `messages`

Armazena todas as mensagens (entrada e saída).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único da mensagem |
| `ticket_id` | UUID | FK para tickets |
| `contact_number` | VARCHAR(255) | Número do contato |
| `direction` | ENUM | `inbound` ou `outbound` |
| `message_type` | VARCHAR(50) | `text`, `audio`, `image`, `video`, `document` |
| `content` | TEXT | Texto da mensagem ou transcrição |
| `media_id` | UUID | FK para media (nullable) |
| `waha_message_id` | VARCHAR(255) | ID da mensagem no WAHA (nullable) |
| `is_ai_generated` | BOOLEAN | Indica se foi enviada por IA |
| `created_at` | TIMESTAMP | Data de criação |

### Tabela: `media`

Armazena arquivos de mídia.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único da mídia |
| `ticket_id` | UUID | FK para tickets |
| `message_id` | UUID | FK para messages |
| `filename` | VARCHAR(255) | Nome do arquivo |
| `mimetype` | VARCHAR(100) | Tipo MIME |
| `file_size` | BIGINT | Tamanho em bytes |
| `file_data` | BYTEA | Dados binários do arquivo |
| `original_url` | TEXT | URL original do WAHA (nullable) |
| `transcription` | TEXT | Transcrição de áudio (nullable) |
| `created_at` | TIMESTAMP | Data de criação |

## 🔌 API Endpoints

### Health Check

```http
GET /health
```

Resposta:
```json
{
  "status": "ok"
}
```

### Webhook (WAHA → Backend)

```http
POST /webhook
```

Recebe eventos do WAHA. Não requer autenticação (deve ser protegido por firewall/rede interna).

### Tickets

#### Buscar Ticket por ID

```http
GET /api/tickets/:id
```

Resposta:
```json
{
  "id": "uuid",
  "contactNumber": "5511999999999@c.us",
  "status": "open",
  "createdAt": "2024-01-01T00:00:00Z",
  "lastInteractionAt": "2024-01-01T00:00:00Z",
  "messages": [
    {
      "id": "uuid",
      "direction": "inbound",
      "content": "Olá",
      "messageType": "text",
      "isAiGenerated": false,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Buscar Ticket por Número de Contato

```http
GET /api/tickets/contact/:contactNumber
```

Retorna o ticket ativo mais recente para o contato.

#### Buscar Mensagens de um Ticket

```http
GET /api/tickets/:id/messages
```

Retorna array de mensagens do ticket.

#### Fechar Ticket

```http
POST /api/tickets/:id/close
```

Resposta:
```json
{
  "success": true,
  "message": "Ticket closed successfully"
}
```

### Mensagens (n8n → Backend → WAHA)

#### Enviar Mensagem

**Rota:** `POST /api/messages`

**URL Completa:** `http://backend:3001/api/messages` (dentro do Docker) ou `http://localhost:3001/api/messages` (do host)

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "ticketId": "uuid-do-ticket",
  "message": "Olá, como posso ajudar?",
  "mediaUrl": "http://backend:3001/api/media/uuid-da-midia" // Opcional
}
```

**Campos:**
- `ticketId` (obrigatório): UUID do ticket obtido no webhook do n8n
- `message` (obrigatório): Texto da mensagem a ser enviada
- `mediaUrl` (opcional): URL da mídia para enviar junto com a mensagem

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Message sent successfully"
}
```

**Respostas de Erro:**

- **400 Bad Request:** Campos obrigatórios faltando
```json
{
  "error": "ticketId and message are required"
}
```

- **404 Not Found:** Ticket não encontrado
```json
{
  "error": "Ticket not found"
}
```

- **500 Internal Server Error:** Erro ao enviar mensagem
```json
{
  "error": "Internal server error"
}
```

**Exemplo de uso no n8n:**

1. No seu workflow do n8n, após processar a mensagem recebida
2. Adicione um nó **HTTP Request**
3. Configure:
   - **Method:** POST
   - **URL:** `http://backend:3001/api/messages`
   - **Authentication:** None (se estiver na mesma rede Docker)
   - **Body Content Type:** JSON
   - **Body:**
     ```json
     {
       "ticketId": "{{ $json.ticketId }}",
       "message": "{{ $json.resposta }}"
     }
     ```
4. A mensagem será enviada automaticamente para o WhatsApp do contato associado ao ticket

### Mídias

#### Baixar Mídia

```http
GET /api/media/:id
```

Retorna o arquivo binário da mídia com os headers `Content-Type` e `Content-Length` apropriados.

### Tools (Ferramentas para IA)

#### Listar Tools Disponíveis

```http
GET /api/tools
```

Resposta:
```json
{
  "tools": [
    {
      "name": "close_ticket",
      "description": "Fecha um ticket específico. Use quando o atendimento for concluído ou quando o usuário não responder mais.",
      "parameters": {
        "type": "object",
        "properties": {
          "ticketId": {
            "type": "string",
            "description": "O ID do ticket que deve ser fechado"
          }
        },
        "required": ["ticketId"]
      }
    }
  ]
}
```

#### Executar Tool

```http
POST /api/tools/execute
Content-Type: application/json

{
  "tool": "close_ticket",
  "parameters": {
    "ticketId": "uuid-do-ticket"
  }
}
```

Resposta de sucesso:
```json
{
  "success": true,
  "result": {
    "message": "Ticket uuid-do-ticket closed successfully",
    "ticketId": "uuid-do-ticket"
  }
}
```

Resposta de erro:
```json
{
  "success": false,
  "error": "Ticket with id 'uuid-do-ticket' not found"
}
```

## 📚 Documentação da API

O backend inclui documentação completa e interativa da API através do Swagger, além de uma versão otimizada para LLMs.

### Swagger UI (Documentação Interativa)

Acesse a documentação interativa do Swagger em:

```
http://localhost:3001/api-docs
```

ou

```
http://backend:3001/api-docs
```

**Recursos do Swagger:**
- Interface visual interativa
- Teste de endpoints diretamente na interface
- Schemas completos de todos os modelos
- Exemplos de requisições e respostas
- Documentação de todos os parâmetros e códigos de status

### Documentação para LLMs (`/llm.txt`)

A rota `/llm.txt` fornece documentação otimizada para Large Language Models:

```
http://localhost:3001/llm.txt
```

**Características:**
- Formato texto simples otimizado para LLMs
- Gerado dinamicamente a partir do Swagger
- Atualiza automaticamente quando o Swagger é modificado
- Inclui todos os endpoints, schemas, fluxos de dados e notas importantes
- Ideal para integração com sistemas de IA

**Conteúdo incluído:**
- Base URLs disponíveis
- Todos os endpoints organizados por categoria
- Parâmetros e request bodies detalhados
- Schemas de dados (Ticket, Message, Tool)
- Fluxos de dados do sistema
- Notas importantes sobre funcionamento

### Atualização Automática

A documentação é gerada dinamicamente:
- **Swagger**: Atualizado automaticamente quando você adiciona/modifica anotações `@swagger` nas rotas
- **llm.txt**: Gerado automaticamente a partir do Swagger, sempre sincronizado

**Para adicionar novas rotas à documentação:**
1. Adicione anotações `@swagger` acima da rota
2. A documentação será atualizada automaticamente
3. Não é necessário recompilar ou reiniciar manualmente

### Exemplo de Uso

**Acessar Swagger:**
```bash
# Abra no navegador
http://localhost:3001/api-docs
```

**Acessar llm.txt:**
```bash
# Via curl
curl http://localhost:3001/llm.txt

# Ou abra no navegador
http://localhost:3001/llm.txt
```

## 🔄 Fluxo de Dados

### Mensagem Recebida (WhatsApp → WAHA → Backend → n8n)

1. Usuário envia mensagem no WhatsApp
2. WAHA recebe e envia webhook para `http://backend:3001/webhook`
3. Backend:
   - Cria ou atualiza ticket
   - Salva mensagem no PostgreSQL
   - Se houver mídia:
     - Baixa do WAHA
     - Armazena no PostgreSQL (BYTEA)
     - Se for áudio: transcreve via Whisper
     - Salva transcrição no banco
   - Envia dados para webhook do n8n
4. n8n processa com IA e pode enviar resposta

### Mensagem Enviada (n8n → Backend → WAHA → WhatsApp)

1. n8n envia POST para `http://backend:3001/api/messages` com:
   - `ticketId`: UUID do ticket (recebido no webhook)
   - `message`: Texto da resposta
   - `mediaUrl`: (opcional) URL da mídia para enviar
2. Backend:
   - Busca ticket pelo ID
   - Obtém o `sessionName` salvo no ticket
   - Envia mensagem via WAHA API usando o `sessionName` correto
   - Salva mensagem no PostgreSQL como `outbound` com `is_ai_generated: true`
   - Atualiza última interação do ticket
3. WAHA envia mensagem para WhatsApp usando a sessão correta
4. Usuário recebe a mensagem

## 📨 Integração com n8n

### Configuração do Workflow no n8n

Após iniciar os serviços e fazer login no n8n, você deve importar o workflow fornecido ou criar um novo seguindo a estrutura abaixo.

**⚠️ IMPORTANTE:** O workflow precisa estar **ATIVO** para receber mensagens. Use o toggle no canto superior direito para ativar.

### Estrutura do Workflow

O workflow deve ter a seguinte estrutura básica:

```
[Webhook] → [Processar Mensagem] → [IA/ChatGPT] → [HTTP Request] → [Resposta]
     ↓              ↓                    ↓              ↓
  Recebe      Extrai dados          Gera resposta   Envia para
  mensagem    do payload            com IA          WhatsApp
```

### 1. Nó Webhook (Entrada)

- **Tipo:** Webhook
- **Método:** POST
- **Path:** `/webhook-test/test` (ou o path configurado no `docker-compose.yml`)
- **Produção:** Ative o workflow para gerar a URL de produção

### 2. Payload Recebido do Backend

O webhook receberá automaticamente os seguintes dados:

```json
{
  "message": "Texto da mensagem ou transcrição de áudio",
  "contactNumber": "5511999999999@lid",
  "ticketId": "uuid-do-ticket",
  "messageType": "text|audio|image|video|document",
  "mediaUrl": "http://backend:3001/api/media/uuid-da-midia" // Se houver mídia
}
```

### 3. Variáveis Disponíveis no Payload

- `$json.ticketId` - UUID do ticket (use para enviar resposta)
- `$json.contactNumber` - Número do contato (formato: `5511999999999@lid`)
- `$json.message` - Texto da mensagem ou transcrição de áudio
- `$json.messageType` - Tipo: `text`, `audio`, `image`, `video`, `document`
- `$json.mediaUrl` - URL da mídia (se houver, acessível via `http://backend:3001/api/media/{id}`)

### 4. Nó HTTP Request (Enviar Resposta)

Após processar a mensagem com IA, adicione um nó **HTTP Request** para enviar a resposta:

- **Método:** POST
- **URL:** `http://backend:3001/api/messages`
- **Body (JSON):**
  ```json
  {
    "ticketId": "{{ $json.ticketId }}",
    "message": "{{ $json.resposta }}"
  }
  ```

**Nota:** O backend gerencia automaticamente o `sessionName` do WAHA, então você não precisa se preocupar com isso.

### URL do Backend no n8n

- **Dentro do Docker (recomendado):** `http://backend:3001`
- **Do host (Windows/Mac/Linux):** `http://localhost:3001` ou `http://host.docker.internal:3001`

### Exemplo de Workflow Completo

1. **Webhook** - Recebe mensagens do backend
2. **Set** - Extrai dados do payload (opcional)
3. **OpenAI/ChatGPT** - Processa mensagem com IA
4. **HTTP Request** - Envia resposta de volta para o backend
5. **Code/Function** - Lógica adicional (opcional)

## 🧪 Testes

### Executar Testes

```bash
cd backend
npm install
npm test
```

### Modo Watch

```bash
npm run test:watch
```

### Com Cobertura

```bash
npm run test:coverage
```

### Configurar Banco de Teste

Crie um arquivo `.env.test` no diretório `backend/`:

```env
DATABASE_URL=postgresql://default:default@localhost:5432/test_db
WAHA_API_URL=http://localhost:3000
WAHA_API_KEY=test-key
WHISPER_API_URL=http://localhost:9000
N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

## 🔧 Troubleshooting

### Backend não conecta ao PostgreSQL

**Sintoma**: Erro "Connection terminated due to connection timeout"

**Solução**:
1. Verifique se o PostgreSQL está rodando: `docker compose ps postgres`
2. Verifique os logs: `docker compose logs postgres`
3. O backend tem retry automático (até 30 tentativas), aguarde alguns segundos
4. Se persistir, verifique a URL de conexão no `docker-compose.yml`

### WAHA não envia webhooks

**Sintoma**: Mensagens não aparecem no backend

**Solução**:
1. Verifique se o webhook está configurado no WAHA dashboard
2. Verifique se o backend está acessível: `curl http://localhost:3001/health`
3. Verifique os logs: `docker compose logs backend`
4. Teste o webhook: `curl http://localhost:3001/webhook/test`

### n8n não recebe dados

**Sintoma**: Backend envia mas n8n não recebe

**Solução**:
1. **IMPORTANTE**: Verifique se o workflow está ATIVO no n8n
2. Verifique a URL do webhook no `docker-compose.yml`
3. Teste o webhook manualmente:
   ```bash
   curl -X POST http://localhost:5678/webhook-test/test \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

### Whisper não transcreve áudios

**Sintoma**: Áudios não são transcritos

**Solução**:
1. Verifique se o Whisper está rodando: `docker compose ps whisper`
2. Verifique os logs: `docker compose logs whisper`
3. Se usar GPU, verifique se está disponível: `docker run --rm --gpus all nvidia/cuda:11.0.3-base-ubuntu20.04 nvidia-smi`
4. Se não tiver GPU, mude para CPU no `docker-compose.yml`

### Erro ao baixar mídias

**Sintoma**: Erro "Failed to fetch media"

**Solução**:
1. Verifique se o WAHA está acessível: `curl http://localhost:3000/health`
2. Verifique a API key do WAHA
3. Verifique os logs do backend para mais detalhes

### PostgreSQL volume error (PostgreSQL 18+)

**Sintoma**: Erro sobre formato de dados incompatível

**Solução**:
1. Pare os containers: `docker compose down`
2. Remova o volume antigo: `docker volume rm chatbotigreja_pgdata`
3. Reinicie: `docker compose up -d`

## 📝 Notas Importantes

### Segurança

- ⚠️ As credenciais padrão (`zapsexy`, `12345678`) devem ser alteradas em produção
- ⚠️ O webhook do WAHA não tem autenticação - proteja com firewall/rede interna
- ⚠️ Configure HTTPS em produção
- ⚠️ Use variáveis de ambiente para senhas e chaves

### Performance

- Para produção, considere usar Redis para cache
- Ajuste o modelo do Whisper conforme necessário (`base`, `small`, `medium`, `large`)
- Configure limites de conexão no PostgreSQL
- Monitore o uso de disco (mídias são armazenadas no banco)

### Backup

- Faça backup regular do volume `pgdata`
- Exporte dados periodicamente:
  ```bash
  docker exec chatbotigreja-postgres-1 pg_dumpall -U default > backup.sql
  ```

## 📚 Recursos Adicionais

- [Documentação WAHA](https://waha.devlike.pro/)
- [Documentação n8n](https://docs.n8n.io/)
- [Documentação Whisper](https://github.com/ahmetoner/whisper-asr-webservice)
- [Documentação PostgreSQL](https://www.postgresql.org/docs/)

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC.

## 👥 Autores

- Seu Nome - [Seu GitHub](https://github.com/seuusuario)

---

**Última atualização**: Janeiro 2024

