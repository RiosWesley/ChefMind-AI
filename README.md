# Agente de IA para Restaurante - WhatsApp

Sistema completo de agente de IA para atendimento de restaurante via WhatsApp. Integra WAHA, n8n e Whisper para criar um assistente virtual inteligente capaz de gerenciar pedidos, consultar cardápio, fornecer informações do restaurante e realizar atendimento automatizado. Todas as mensagens, mídias e dados de pedidos são armazenados no PostgreSQL.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Funcionalidades](#funcionalidades)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Integração com LM Studio](#integração-com-lm-studio)
- [Como Iniciar](#como-iniciar)
- [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
- [API Endpoints](#api-endpoints)
- [Documentação da API](#documentação-da-api)
- [Fluxo de Dados](#fluxo-de-dados)
- [Testes](#testes)
- [Troubleshooting](#troubleshooting)

## 🎯 Visão Geral

Este sistema é um **agente de IA completo** para restaurantes que permite:

- **Atendimento Automatizado**: Receber e responder mensagens do WhatsApp via WAHA
- **Gerenciamento de Pedidos**: Criar, consultar, atualizar e cancelar pedidos
- **Consulta de Cardápio**: Buscar itens, categorias e detalhes do menu
- **Informações do Restaurante**: Horários, área de entrega, promoções
- **Processamento com IA**: Integração com n8n para processamento inteligente de mensagens
- **Tools para IA**: 12 ferramentas disponíveis para o agente executar ações
- **Transcrição de Áudios**: Conversão automática de áudios em texto via Whisper
- **Armazenamento Completo**: Todas as mensagens, mídias e pedidos no PostgreSQL
- **Documentação Interativa**: Swagger UI e documentação otimizada para LLMs

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
- **Backend**: Serviço Node.js/TypeScript que gerencia tickets, pedidos, cardápio e integra todos os componentes
- **PostgreSQL**: Banco de dados para armazenar tickets, mensagens, mídias, pedidos, cardápio e informações do restaurante
- **n8n**: Plataforma de automação para processar mensagens com IA e executar tools
- **Whisper**: Serviço de transcrição de áudios (OpenAI Whisper)
- **Redis**: (Opcional) Pode ser usado para cache

## ✨ Funcionalidades

### 🤖 Agente de IA com Tools
O sistema fornece **12 tools** que o agente de IA pode executar para realizar ações:

**Gerenciamento de Pedidos:**
- `create_order`: Criar novo pedido com itens do cardápio
- `get_order`: Consultar status e detalhes de um pedido
- `update_order`: Adicionar, remover ou modificar itens de um pedido
- `cancel_order`: Cancelar um pedido
- `list_orders`: Listar pedidos do cliente

**Consulta de Cardápio:**
- `get_menu`: Buscar cardápio completo ou por categoria
- `search_menu_item`: Buscar itens específicos no cardápio
- `get_menu_item_details`: Obter detalhes completos de um item (preço, ingredientes, alergênicos)

**Informações do Restaurante:**
- `get_restaurant_hours`: Consultar horários de funcionamento
- `get_delivery_info`: Informações sobre entrega (área, taxa, tempo estimado)
- `get_promotions`: Listar promoções ativas

**Gerenciamento de Tickets:**
- `close_ticket`: Fechar ticket de atendimento

### 📦 Gerenciamento de Pedidos
- Criação de pedidos com validação de itens disponíveis
- Cálculo automático de totais (subtotal + taxa de entrega)
- Validação de horário de funcionamento
- Validação de área de entrega
- Suporte a delivery e retirada (pickup)
- Rastreamento de status: pending, confirmed, preparing, ready, delivered, cancelled
- Histórico completo de pedidos por cliente

### 🍽️ Gerenciamento de Cardápio
- Categorias de itens organizadas
- Informações detalhadas: preço, descrição, ingredientes, alergênicos
- Controle de disponibilidade de itens
- Busca por nome ou descrição
- Filtro por categoria

### 🏪 Informações do Restaurante
- Horários de funcionamento por dia da semana
- Verificação automática se está aberto
- Área de entrega configurável
- Taxa de entrega e valor mínimo
- Tempo estimado de entrega
- Promoções ativas com validade

### 🎫 Gerenciamento de Tickets
- Criação automática de tickets para cada contato
- Armazenamento automático do session name do WAHA
- Fechamento automático após 15 minutos de inatividade
- Fechamento manual via API ou tool
- Busca de tickets por ID ou número de contato

### 💬 Armazenamento de Mensagens
- Todas as mensagens (entrada e saída) são salvas no banco
- Suporte a texto, imagens, vídeos, áudios e documentos
- Histórico completo de conversas por ticket
- Identificação de mensagens enviadas por IA (`is_ai_generated`)

### 📎 Armazenamento de Mídias
- Download automático de mídias do WAHA
- Armazenamento em BYTEA no PostgreSQL
- URLs normalizadas para acesso via proxy do backend
- Transcrição automática de áudios via Whisper

### 🔗 Integração com n8n
- Envio automático de novas mensagens para webhook do n8n
- Recebimento de respostas do n8n para enviar ao WhatsApp
- Payload completo com ticketId, mensagem, tipo e URL de mídia
- Execução de tools via API para ações do agente
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
cd chefmind-ia
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (opcional, as variáveis podem ser definidas no docker-compose.yml):

```env
# Webhook do n8n (ajuste conforme necessário)
N8N_WEBHOOK_URL=http://host.docker.internal:5678/webhook-test/test
```

### 3. Configurar Whisper (CPU ou GPU)

O Whisper é usado automaticamente pelo backend para transcrever áudios recebidos via WhatsApp.

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

**Modelos disponíveis:**
- `tiny` - Mais rápido, menor precisão
- `base` - Balanceado (recomendado para CPU)
- `small` - Melhor precisão (padrão no docker-compose.yml)
- `medium` - Alta precisão, mais lento
- `large` - Máxima precisão, muito lento

**Rotas do Whisper API:**

O backend usa automaticamente a rota `/asr` do Whisper. Se precisar usar diretamente:

```bash
# Transcrever áudio
POST http://localhost:9000/asr
Content-Type: multipart/form-data

Form Data:
- audio_file: (arquivo de áudio)
- language: pt
- response_format: text
```

**Como funciona:**
1. Quando um áudio é recebido via WhatsApp, o backend automaticamente:
   - Baixa o áudio do WAHA
   - Envia para o Whisper via `/asr`
   - Salva a transcrição no banco de dados
   - Inclui a transcrição no payload enviado para o n8n

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

## 🤖 Integração com LM Studio

O LM Studio pode ser usado no n8n para processar mensagens com modelos de linguagem locais. Aqui estão as recomendações:

### Instalação do LM Studio

1. **Baixe e instale o LM Studio:**
   - Acesse: https://lmstudio.ai/
   - Baixe a versão para seu sistema operacional
   - Instale e abra o aplicativo

2. **Configure o servidor local:**
   - No LM Studio, vá para a aba "Local Server"
   - Clique em "Start Server"
   - Anote a URL (geralmente `http://localhost:1234` ou o IP da sua máquina, ex: `http://100.76.6.119:1234`)

### Modelos Recomendados para Português

**Para roteamento de intenções (recomendado):**
- **gemma-3-270m-model-router** - Modelo leve de 270M otimizado para classificação de intenções e roteamento. Ideal para decidir entre diferentes fluxos de atendimento.

**Para uso geral e processamento:**
- **gemma-3-270m-it** - Versão instruction-tuned do modelo de 270M, otimizada para seguir instruções e gerar respostas.
- **qwen/qwen3-vl-4b** - Excelente para português, rápido e eficiente, com suporte multimodal (texto e imagem).
- **LFM2-8B-A1B** - Excelente para tarefas que necessitem de maior proeficiência de Tools, mas sem abrir mão de ser leve.

### Configuração de Parâmetros de Inferência

Para garantir a melhor consistência no formato JSON e precisão na classificação, especialmente para modelos menores como o **gemma-3-270m-model-router**, use os seguintes parâmetros:

| Parâmetro | Valor | Motivo |
|-----------|-------|--------|
| **Temperature** | `0.6` | Equilíbrio ideal para este modelo de 270M não "alucinar" o JSON, mas entender variações linguísticas. |
| **Top P** | `0.95` | Nucleus sampling padrão para evitar respostas de baixa probabilidade. |
| **Top K** | `64` | Limita o vocabulário de escolha, ajudando a manter o foco nas tags JSON. |

**Configuração no LM Studio:**
1. No LM Studio, após carregar o modelo, vá em "Inference Parameters"
2. Configure:
   - Temperature: `0.6`
   - Top P: `0.95`
   - Top K: `64`
3. Salve as configurações para uso no n8n

### Configuração no n8n

1. **Criar credencial OpenAI:**
   - No n8n, vá em **Credentials** → **Add Credential**
   - Selecione **OpenAI API**
   - Configure:
     - **API Key:** Qualquer valor (não é usado pelo LM Studio)
     - **Base URL:** URL do seu servidor LM Studio (ex: `http://localhost:1234/v1` ou `http://100.76.6.119:1234/v1`)
   - Salve a credencial

2. **Usar nos nós LangChain:**
   - Nos nós do tipo **OpenAI Chat Model**, selecione a credencial criada
   - Selecione o modelo desejado (ex: `gemma-3-270m-model-router`, `gemma-3-270m-it`)
   - Os parâmetros configurados no LM Studio serão aplicados automaticamente

### Dicas de Uso

- **Contexto do Ticket:** Inclua o histórico de mensagens no prompt para melhor contexto
- **Instruções do Sistema:** Defina claramente o papel do assistente no `system` message
- **Token Limit:** Ajuste `max_tokens` conforme necessário (mais tokens = respostas mais longas)
- **Performance:** Modelos menores (270M-4B) são mais rápidos e suficientes para a maioria dos casos
- **Tools/Functions:** Use function calling para permitir que a IA execute as tools automaticamente
- **Roteamento de Intenções:** Use modelos especializados como `gemma-3-270m-model-router` para classificar intenções antes de processar com modelos maiores

### Usando Tools no n8n

O sistema fornece 12 tools que podem ser executadas pelo agente de IA. Para usar:

1. **Obter lista de tools:**
   - Adicione um nó HTTP Request antes do processamento com IA
   - Method: GET
   - URL: `http://backend:3001/api/tools`
   - Salve o resultado em uma variável

2. **Incluir tools no prompt da IA:**
   - Use a lista de tools obtida no passo anterior
   - Inclua no body da requisição para LM Studio/OpenAI
   - Configure o modelo para usar function calling

3. **Executar tool quando solicitada pela IA:**
   - Adicione um nó IF para verificar se a IA quer executar uma tool
   - Se sim, adicione um nó HTTP Request:
     - Method: POST
     - URL: `http://backend:3001/api/tools/execute`
     - Body: `{{ $json.tool_call }}` (ajuste conforme formato da resposta da IA)

4. **Exemplo de workflow com tools:**
   ```
   [Webhook] → [Get Tools] → [LM Studio] → [IF Tool?] → [Execute Tool] → [Send Message]
   ```

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

### 4. Configurar Dados Iniciais

Antes de usar o sistema, você precisa popular algumas informações básicas:

**1. Informações do Restaurante:**
```sql
UPDATE restaurant_info SET 
  name = 'Nome do Restaurante',
  phone = '11999999999',
  address = 'Endereço completo',
  opening_hours = '{"monday": {"open": "09:00", "close": "22:00"}, ...}'::jsonb,
  delivery_area = ARRAY['Bairro 1', 'Bairro 2'],
  delivery_fee = 5.00,
  min_order_value = 20.00,
  estimated_delivery_time_minutes = 30;
```

**2. Categorias do Cardápio:**
```sql
INSERT INTO menu_categories (name, description, display_order) VALUES
  ('Pizzas', 'Nossas deliciosas pizzas', 1),
  ('Bebidas', 'Refrigerantes e sucos', 2),
  ('Sobremesas', 'Doces e sobremesas', 3);
```

**3. Itens do Cardápio:**
```sql
INSERT INTO menu_items (category_id, name, description, price, is_available) VALUES
  ('uuid-categoria', 'Pizza Margherita', 'Molho, mussarela e manjericão', 35.90, true),
  ('uuid-categoria', 'Coca-Cola', 'Lata 350ml', 5.50, true);
```

### 5. Testar o Sistema

Envie uma mensagem para o número conectado no WhatsApp. O sistema deve:
- Criar um ticket automaticamente
- Enviar a mensagem para o n8n
- Processar com IA (se configurado)
- O agente pode executar tools para criar pedidos, consultar cardápio, etc.
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

### Tabela: `menu_categories`

Armazena categorias do cardápio.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único da categoria |
| `name` | VARCHAR(255) | Nome da categoria |
| `description` | TEXT | Descrição da categoria (nullable) |
| `display_order` | INTEGER | Ordem de exibição |
| `is_active` | BOOLEAN | Se a categoria está ativa |
| `created_at` | TIMESTAMP | Data de criação |

### Tabela: `menu_items`

Armazena itens do cardápio.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único do item |
| `category_id` | UUID | FK para menu_categories |
| `name` | VARCHAR(255) | Nome do item |
| `description` | TEXT | Descrição do item (nullable) |
| `price` | DECIMAL(10,2) | Preço do item |
| `image_url` | TEXT | URL da imagem (nullable) |
| `ingredients` | TEXT[] | Lista de ingredientes (nullable) |
| `allergens` | TEXT[] | Lista de alergênicos (nullable) |
| `is_available` | BOOLEAN | Se o item está disponível |
| `display_order` | INTEGER | Ordem de exibição |
| `created_at` | TIMESTAMP | Data de criação |

### Tabela: `orders`

Armazena pedidos dos clientes.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único do pedido |
| `ticket_id` | UUID | FK para tickets |
| `contact_number` | VARCHAR(255) | Número do contato |
| `status` | ENUM | `pending`, `confirmed`, `preparing`, `ready`, `delivered`, `cancelled` |
| `delivery_type` | ENUM | `delivery` ou `pickup` |
| `delivery_address` | TEXT | Endereço de entrega (nullable) |
| `subtotal` | DECIMAL(10,2) | Subtotal dos itens |
| `delivery_fee` | DECIMAL(10,2) | Taxa de entrega |
| `total` | DECIMAL(10,2) | Total do pedido |
| `estimated_time_minutes` | INTEGER | Tempo estimado em minutos (nullable) |
| `cancelled_at` | TIMESTAMP | Data de cancelamento (nullable) |
| `cancellation_reason` | TEXT | Motivo do cancelamento (nullable) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

### Tabela: `order_items`

Armazena itens de cada pedido.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único do item do pedido |
| `order_id` | UUID | FK para orders |
| `menu_item_id` | UUID | FK para menu_items |
| `quantity` | INTEGER | Quantidade |
| `unit_price` | DECIMAL(10,2) | Preço unitário no momento do pedido |
| `subtotal` | DECIMAL(10,2) | Subtotal do item |
| `notes` | TEXT | Observações do cliente (nullable) |
| `created_at` | TIMESTAMP | Data de criação |

### Tabela: `restaurant_info`

Armazena informações do restaurante (singleton).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único |
| `name` | VARCHAR(255) | Nome do restaurante |
| `phone` | VARCHAR(255) | Telefone (nullable) |
| `address` | TEXT | Endereço (nullable) |
| `opening_hours` | JSONB | Horários de funcionamento por dia |
| `delivery_area` | TEXT[] | Lista de áreas de entrega (nullable) |
| `delivery_fee` | DECIMAL(10,2) | Taxa de entrega padrão (nullable) |
| `min_order_value` | DECIMAL(10,2) | Valor mínimo do pedido (nullable) |
| `estimated_delivery_time_minutes` | INTEGER | Tempo estimado de entrega (nullable) |
| `updated_at` | TIMESTAMP | Data de atualização |

### Tabela: `promotions`

Armazena promoções ativas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único da promoção |
| `title` | VARCHAR(255) | Título da promoção |
| `description` | TEXT | Descrição (nullable) |
| `discount_type` | ENUM | `percentage` ou `fixed` |
| `discount_value` | DECIMAL(10,2) | Valor do desconto |
| `min_order_value` | DECIMAL(10,2) | Valor mínimo do pedido (nullable) |
| `valid_from` | TIMESTAMP | Data de início |
| `valid_until` | TIMESTAMP | Data de término |
| `is_active` | BOOLEAN | Se a promoção está ativa |
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

O sistema fornece 12 tools que o agente de IA pode executar. As tools são acessadas via API e podem ser chamadas pelo n8n ou qualquer sistema de IA.

#### Listar Tools Disponíveis

```http
GET /api/tools
```

Resposta (exemplo com algumas tools):
```json
{
  "tools": [
    {
      "name": "create_order",
      "description": "Cria um novo pedido com itens do cardápio...",
      "parameters": {
        "type": "object",
        "properties": {
          "ticketId": { "type": "string" },
          "items": { "type": "array" },
          "deliveryType": { "type": "string", "enum": ["delivery", "pickup"] }
        },
        "required": ["ticketId", "items", "deliveryType"]
      }
    },
    {
      "name": "get_menu",
      "description": "Busca o cardápio completo ou filtrado por categoria...",
      "parameters": {
        "type": "object",
        "properties": {
          "categoryId": { "type": "string" }
        }
      }
    }
    // ... mais 10 tools
  ]
}
```

#### Executar Tool

```http
POST /api/tools/execute
Content-Type: application/json

{
  "tool": "create_order",
  "parameters": {
    "ticketId": "uuid-do-ticket",
    "items": [
      {
        "menuItemId": "uuid-do-item",
        "quantity": 2,
        "notes": "Sem cebola"
      }
    ],
    "deliveryType": "delivery",
    "deliveryAddress": "Rua Exemplo, 123"
  }
}
```

Resposta de sucesso:
```json
{
  "success": true,
  "result": {
    "orderId": "uuid-do-pedido",
    "status": "pending",
    "total": 45.90,
    "estimatedTimeMinutes": 30,
    "message": "Order created successfully"
  }
}
```

Resposta de erro:
```json
{
  "success": false,
  "error": "Menu item not found or not available"
}
```

#### Exemplos de Uso das Tools

**Criar Pedido:**
```json
{
  "tool": "create_order",
  "parameters": {
    "ticketId": "uuid",
    "items": [{"menuItemId": "uuid", "quantity": 1}],
    "deliveryType": "delivery",
    "deliveryAddress": "Endereço completo"
  }
}
```

**Consultar Cardápio:**
```json
{
  "tool": "get_menu",
  "parameters": {
    "categoryId": "uuid-categoria" // opcional
  }
}
```

**Buscar Item no Cardápio:**
```json
{
  "tool": "search_menu_item",
  "parameters": {
    "query": "pizza",
    "categoryId": "uuid" // opcional
  }
}
```

**Consultar Horários:**
```json
{
  "tool": "get_restaurant_hours",
  "parameters": {}
}
```

**Listar Pedidos:**
```json
{
  "tool": "list_orders",
  "parameters": {
    "ticketId": "uuid",
    "status": "pending", // opcional
    "limit": 10 // opcional
  }
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

Após iniciar os serviços e fazer login no n8n, você deve importar o workflow fornecido (arquivo `.json`) ou criar um novo seguindo a estrutura abaixo.

**⚠️ IMPORTANTE:** O workflow precisa estar **ATIVO** para receber mensagens. Use o toggle no canto superior direito para ativar.

### Estrutura do Workflow Recomendada

O workflow recomendado tem a seguinte estrutura:

```
[Webhook] → [Set Dados] → [Switch por Tipo] → [Processar Mídia] → [Buffer Redis]
     ↓            ↓              ↓                    ↓                ↓
  Recebe    Extrai dados    Texto/Audio/      Transcrição/      Aguarda novas
  mensagem  do payload      Imagem            Processamento     mensagens
                                                                    ↓
[Buscar Histórico] → [Resumir Conversa] → [Roteamento] → [Agentes] → [Resposta]
     ↓                    ↓                    ↓            ↓           ↓
  PostgreSQL          Summarization      Classifica    INFO/RAG    Envia para
  Chat History        Chain             Intenções     Agents      WhatsApp
```

### 1. Nó Webhook (Entrada)

- **Tipo:** Webhook
- **Método:** POST
- **Path:** `/test` (ou o path configurado no `docker-compose.yml`)
- **Produção:** Ative o workflow para gerar a URL de produção

### 2. Payload Recebido do Backend

O webhook receberá automaticamente os seguintes dados:

```json
{
  "message": "Texto da mensagem ou transcrição de áudio",
  "contactNumber": "5511999999999@lid",
  "ticketId": "uuid-do-ticket",
  "messageType": "text|audio|image|video|document",
  "mediaUrl": "http://backend:3001/api/media/uuid-da-midia",
  "audio": {
    "base64": "base64-encoded-audio" // Se for áudio
  },
  "systemPrompt": "Prompt do sistema (opcional)"
}
```

### 3. Variáveis Disponíveis no Payload

- `$json.body.ticketId` - UUID do ticket (use para enviar resposta)
- `$json.body.contactNumber` - Número do contato (formato: `5511999999999@lid`)
- `$json.body.message` - Texto da mensagem ou transcrição de áudio
- `$json.body.messageType` - Tipo: `text`, `audio`, `image`, `video`, `document`
- `$json.body.mediaUrl` - URL da mídia (se houver, acessível via `http://backend:3001/api/media/{id}`)
- `$json.body.audio.base64` - Áudio codificado em base64 (se for áudio)

### 4. Processamento por Tipo de Mídia

#### Texto
- Mensagens de texto são processadas diretamente
- Vão para o buffer Redis para aguardar possíveis mensagens adicionais

#### Áudio
1. **Download do áudio** via `mediaUrl`
2. **Transcrição** usando Whisper (`http://whisper:9000/asr`)
3. **Formatação** da transcrição com prefixo "Transcrição:"
4. **Buffer Redis** para aguardar possíveis mensagens adicionais

#### Imagem
1. **Download da imagem** via `mediaUrl`
2. **Conversão para Base64**
3. **Processamento multimodal** usando modelo com suporte a visão (ex: `qwen/qwen3-vl-4b`)
4. **Extração de texto** da descrição da imagem
5. **Buffer Redis** para aguardar possíveis mensagens adicionais

### 5. Sistema de Buffer com Redis

O workflow utiliza Redis para criar um buffer de mensagens, permitindo:
- **Aguardar múltiplas mensagens** em sequência antes de processar
- **Evitar processamento prematuro** quando o usuário está digitando
- **Agrupar mensagens relacionadas** para melhor contexto

**Fluxo:**
1. Mensagem chega → Adiciona ao Redis (lista)
2. Aguarda 0 segundos (configurável via Wait node)
3. Verifica se chegou nova mensagem
4. Se sim, repete o processo
5. Se não, processa todas as mensagens acumuladas

### 6. Sistema de Roteamento de Intenções

O workflow utiliza um modelo especializado (`gemma-3-270m-model-router`) para classificar a intenção da mensagem:

**Intenções possíveis:**
- `ORDER_FLOW`: Pedir comida, alterar pedido, cancelar, ver cardápio, status
- `INFO_FLOW`: Perguntas institucionais (horário, endereço, wi-fi) ou saudações vazias
- `HUMAN_HANDOFF`: Cliente irritado ou pedindo atendente humano

**Prompt de roteamento:**
```
# Contexto
Você é o cérebro de triagem de um restaurante. Sua função é analisar a conversa e decidir para qual departamento encaminhar o cliente.

# Instruções
1. Analise o Histórico para entender o contexto
2. Classifique a intenção atual em: ORDER_FLOW, INFO_FLOW ou HUMAN_HANDOFF

# Saída
Responda ESTRITAMENTE um JSON:
{
  "intent": "ORDER_FLOW" | "INFO_FLOW" | "HUMAN_HANDOFF",
  "reason": "breve explicação"
}
```

### 7. Agentes Especializados

Após o roteamento, o workflow direciona para agentes especializados:

#### INFO-AGENT
- **Modelo:** `qwen/qwen3-vl-4b` ou `gemma-3-270m-it`
- **Função:** Responder perguntas institucionais e saudações
- **Memória:** PostgreSQL Chat Memory
- **Tools:** `close_ticket` (para finalizar atendimento)

#### RAG-AGENT
- **Modelo:** `gemma-3-270m-it`
- **Função:** Processar pedidos e consultas sobre cardápio
- **Memória:** PostgreSQL Chat Memory
- **Tools:** Todas as 12 tools disponíveis (criar pedido, consultar cardápio, etc.)

### 8. Histórico e Resumo de Conversas

O workflow utiliza PostgreSQL para armazenar e recuperar histórico:

1. **Busca histórico** do ticket via SQL query
2. **Processa mensagens** para extrair role (Cliente/Atendente) e conteúdo
3. **Gera resumo** usando Summarization Chain com modelo `gemma-3-270m-it`
4. **Formata últimas mensagens** do cliente (últimas 4, numeradas)
5. **Inclui no contexto** do roteamento e dos agentes

### 9. Geração de Resposta em Áudio (Opcional)

O workflow pode gerar respostas em áudio usando Gemini TTS:

1. **Verifica se deve gerar áudio** (se a resposta começa com "Audio: ")
2. **Gera áudio** via Gemini TTS API
3. **Converte formato** (PCM → Opus) usando ffmpeg
4. **Envia áudio** via endpoint especial: `http://backend:3001/api/messages/audio`

**Configuração do Gemini TTS:**
- Voice: `Sulafat` (pt-BR)
- Language: `pt-BR`
- Efeitos: Reverb small room, ruídos leves
- Velocidade: Levemente rápida e amigável

### 10. Envio de Resposta

#### Resposta em Texto
- **Método:** POST
- **URL:** `http://backend:3001/api/messages`
- **Body:**
  ```json
  {
    "ticketId": "{{ $('Dados').first().json.ticketId }}",
    "message": "{{ $json.output }}"
  }
  ```

#### Resposta em Áudio
- **Método:** POST
- **URL:** `http://backend:3001/api/messages/audio`
- **Headers:** `x-api-key: backendsexy`
- **Body:**
  ```json
  {
    "ticketId": "{{ $('Dados').item.json.ticketId }}",
    "audioBase64": "{{ $json.data }}",
    "mimeType": "audio/opus"
  }
  ```

### 11. Split de Mensagens Múltiplas

O workflow suporta envio de múltiplas mensagens:
1. **Split** da resposta por `\n\n` (parágrafos duplos)
2. **Loop** sobre cada mensagem
3. **Envio sequencial** com delay de 2 segundos entre mensagens (opcional)

### URL do Backend no n8n

- **Dentro do Docker (recomendado):** `http://backend:3001`
- **Do host (Windows/Mac/Linux):** `http://localhost:3001` ou `http://host.docker.internal:3001`
- **Para áudio:** `http://backend:3001` (se disponível)

### Exemplo de Workflow Completo

1. **Webhook** - Recebe mensagens do backend
2. **Set Dados** - Extrai dados do payload
3. **Switch** - Roteia por tipo de mídia (texto/áudio/imagem)
4. **Processamento de Mídia** - Transcrição ou processamento multimodal
5. **Buffer Redis** - Aguarda possíveis mensagens adicionais
6. **Buscar Histórico** - Recupera histórico do PostgreSQL
7. **Processar Histórico** - Formata e extrai informações relevantes
8. **Resumir Conversa** - Gera resumo usando Summarization Chain
9. **Roteamento** - Classifica intenção usando modelo especializado
10. **Agentes** - Processa com agente apropriado (INFO ou RAG)
11. **Geração de Áudio** - (Opcional) Gera resposta em áudio
12. **Envio** - Envia resposta de volta para o backend

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
2. Remova o volume antigo: `docker volume rm chefmind-ia_pgdata`
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
  docker exec chefmind-ia-postgres-1 pg_dumpall -U default > backup.sql
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

**Última atualização**: Janeiro 2025

