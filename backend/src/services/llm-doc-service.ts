import { swaggerSpec } from '../config/swagger';

export class LlmDocService {
  generateLlmTxt(): string {
    const spec = swaggerSpec as any;
    
    let doc = `# WAHA Ticket Manager API - Documentação para LLMs\n\n`;
    doc += `${spec.info.description}\n\n`;
    
    // Base URLs
    doc += `## Base URLs\n\n`;
    if (spec.servers && spec.servers.length > 0) {
      spec.servers.forEach((server: any) => {
        doc += `- ${server.description}: ${server.url}\n`;
      });
      doc += `\n`;
    }
    
    // Endpoints por tag
    const paths = spec.paths || {};
    const tags = spec.tags || [];
    
    tags.forEach((tag: any) => {
      doc += `## ${tag.name}\n\n`;
      if (tag.description) {
        doc += `${tag.description}\n\n`;
      }
      
      Object.entries(paths).forEach(([path, methods]: [string, any]) => {
        Object.entries(methods).forEach(([method, operation]: [string, any]) => {
          if (operation.tags && operation.tags.includes(tag.name)) {
            const methodUpper = method.toUpperCase();
            doc += `### ${methodUpper} ${path}\n\n`;
            
            if (operation.summary) {
              doc += `${operation.summary}\n\n`;
            }
            
            if (operation.description) {
              doc += `${operation.description}\n\n`;
            }
            
            // Parâmetros
            if (operation.parameters && operation.parameters.length > 0) {
              doc += `**Parâmetros:**\n`;
              operation.parameters.forEach((param: any) => {
                doc += `- ${param.name} (${param.in}): ${param.description || ''} `;
                if (param.required) {
                  doc += `[obrigatório]`;
                }
                if (param.schema?.format) {
                  doc += ` - formato: ${param.schema.format}`;
                }
                doc += `\n`;
              });
              doc += `\n`;
            }
            
            // Request Body
            if (operation.requestBody) {
              doc += `**Body:**\n`;
              const content = operation.requestBody.content?.['application/json'];
              if (content?.schema) {
                const schema = content.schema;
                if (schema.required) {
                  doc += `Campos obrigatórios: ${schema.required.join(', ')}\n`;
                }
                if (schema.properties) {
                  doc += `\n`;
                  Object.entries(schema.properties).forEach(([prop, propSchema]: [string, any]) => {
                    doc += `- ${prop} (${propSchema.type || 'any'}): ${propSchema.description || ''}`;
                    if (schema.required?.includes(prop)) {
                      doc += ` [obrigatório]`;
                    }
                    doc += `\n`;
                  });
                }
              }
              doc += `\n`;
            }
            
            // Responses
            if (operation.responses) {
              doc += `**Respostas:**\n`;
              Object.entries(operation.responses).forEach(([status, response]: [string, any]) => {
                doc += `- ${status}: ${response.description || ''}\n`;
              });
              doc += `\n`;
            }
          }
        });
      });
    });
    
    // Schemas
    if (spec.components?.schemas) {
      doc += `## Schemas\n\n`;
      Object.entries(spec.components.schemas).forEach(([name, schema]: [string, any]) => {
        if (name !== 'Error') {
          doc += `### ${name}\n\n`;
          if (schema.properties) {
            doc += `\`\`\`json\n{\n`;
            Object.entries(schema.properties).forEach(([prop, propSchema]: [string, any], index, arr) => {
              const isLast = index === arr.length - 1;
              doc += `  "${prop}": ${this.getExampleValue(propSchema)}${isLast ? '' : ','}\n`;
            });
            doc += `}\n\`\`\`\n\n`;
          }
        }
      });
    }
    
    // Notas importantes
    doc += `## Notas Importantes\n\n`;
    doc += `- O sessionName é gerenciado automaticamente pelo backend\n`;
    doc += `- Tickets são fechados automaticamente após 15 minutos de inatividade\n`;
    doc += `- Mídias são armazenadas no PostgreSQL como BYTEA\n`;
    doc += `- Áudios são transcritos automaticamente via Whisper\n`;
    doc += `- Mensagens enviadas por IA têm isAiGenerated: true\n`;
    doc += `- O formato de número é: {código_país}{número}@lid (ex: 5511999999999@lid)\n\n`;
    
    // Fluxo de dados
    doc += `## Fluxo de Dados\n\n`;
    doc += `### Mensagem Recebida (WhatsApp → WAHA → Backend → n8n)\n`;
    doc += `1. Usuário envia mensagem no WhatsApp\n`;
    doc += `2. WAHA recebe e envia webhook para /webhook\n`;
    doc += `3. Backend cria/atualiza ticket, salva mensagem e mídia\n`;
    doc += `4. Se for áudio, transcreve via Whisper\n`;
    doc += `5. Envia dados para n8n webhook\n\n`;
    
    doc += `### Mensagem Enviada (n8n → Backend → WAHA → WhatsApp)\n`;
    doc += `1. n8n envia POST para /api/messages com ticketId e message\n`;
    doc += `2. Backend busca ticket, obtém sessionName\n`;
    doc += `3. Envia mensagem via WAHA API usando sessionName\n`;
    doc += `4. Salva mensagem como outbound com isAiGenerated: true\n`;
    doc += `5. WAHA envia para WhatsApp\n\n`;
    
    return doc;
  }
  
  private getExampleValue(schema: any): string {
    if (schema.example !== undefined) {
      return JSON.stringify(schema.example);
    }
    if (schema.type === 'string') {
      if (schema.format === 'uuid') return '"uuid-example"';
      if (schema.format === 'date-time') return '"2024-01-01T00:00:00Z"';
      if (schema.format === 'uri') return '"http://example.com"';
      if (schema.enum) return `"${schema.enum[0]}"`;
      return '"string"';
    }
    if (schema.type === 'number') return '0';
    if (schema.type === 'integer') return '0';
    if (schema.type === 'boolean') return 'false';
    if (schema.type === 'array') return '[]';
    if (schema.type === 'object') return '{}';
    return 'null';
  }
}

