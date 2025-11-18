# Debug - Webhook WAHA

## Problema: Backend não recebe mensagens do WAHA

### Verificações

1. **Verificar se o backend está rodando:**
   ```bash
   docker compose ps
   curl http://localhost:3001/health
   ```

2. **Verificar logs do backend:**
   ```bash
   docker compose logs -f backend
   ```

3. **Verificar logs do WAHA:**
   ```bash
   docker compose logs -f waha
   ```

4. **Testar endpoint do webhook manualmente:**
   ```bash
   curl -X POST http://localhost:3001/webhook \
     -H "Content-Type: application/json" \
     -d '{"event":"message","payload":{"id":"test","from":"5511999999999","to":"5511888888888","type":"text","body":"test","timestamp":1234567890}}'
   ```

5. **Verificar conectividade entre containers:**
   ```bash
   docker compose exec waha ping backend
   docker compose exec backend ping waha
   ```

6. **Verificar configuração do webhook no WAHA:**
   - Acesse o dashboard do WAHA: http://localhost:3000
   - Verifique se o webhook está configurado: `http://backend:3001/webhook`
   - Verifique se os eventos estão habilitados: `message`

### Possíveis Problemas

1. **Backend não está escutando em 0.0.0.0:**
   - ✅ Corrigido: backend agora escuta em `0.0.0.0`

2. **Formato do payload do WAHA:**
   - O código agora aceita múltiplos formatos de payload
   - Logs detalhados foram adicionados para debug

3. **WAHA não consegue alcançar o backend:**
   - Verifique se ambos estão na mesma rede Docker
   - Verifique se o backend está pronto antes do WAHA tentar enviar

4. **Webhook não está configurado no WAHA:**
   - A variável `WHATSAPP_HOOK_URL` deve estar definida
   - Pode ser necessário configurar via API do WAHA também

### Configuração via API do WAHA

Se a variável de ambiente não funcionar, configure via API:

```bash
curl -X POST http://localhost:3000/api/settings \
  -H "X-Api-Key: zapsexy" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "url": "http://backend:3001/webhook",
      "events": ["message"]
    }
  }'
```

### Logs Esperados

Quando uma mensagem chegar, você deve ver nos logs do backend:

```
Webhook received: { ... }
Processing message: { id: ..., from: ..., type: ... }
Handling new message from: 5511999999999
Creating new ticket: { ... }
Sending ticket ... to n8n
Ticket ... created and sent to n8n for 5511999999999
```

