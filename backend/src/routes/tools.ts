import { Router, Request, Response } from 'express';
import { ToolService } from '../services/tool-service';

export const createToolsRouter = (toolService: ToolService): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/tools:
   *   get:
   *     summary: Lista todas as ferramentas disponíveis para IA
   *     tags: [Tools]
   *     responses:
   *       200:
   *         description: Lista de ferramentas disponíveis
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 tools:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Tool'
   */
  router.get('/', (_req: Request, res: Response) => {
    try {
      const tools = toolService.getAvailableTools();
      res.json({ tools });
    } catch (error) {
      console.error('Error getting tools:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/tools/execute:
   *   post:
   *     summary: Executa uma ferramenta
   *     tags: [Tools]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tool
   *               - parameters
   *             properties:
   *               tool:
   *                 type: string
   *                 description: Nome da ferramenta
   *                 example: close_ticket
   *               parameters:
   *                 type: object
   *                 description: Parâmetros da ferramenta
   *                 example:
   *                   ticketId: "uuid-do-ticket"
   *     responses:
   *       200:
   *         description: Ferramenta executada com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 result:
   *                   type: object
   *       400:
   *         description: Erro na execução da ferramenta
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   */
  router.post('/execute', async (req: Request, res: Response) => {
    try {
      const { tool, parameters } = req.body;

      if (!tool) {
        return res.status(400).json({ error: 'tool is required' });
      }

      if (!parameters) {
        return res.status(400).json({ error: 'parameters is required' });
      }

      const result = await toolService.executeTool({ tool, parameters });
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Error executing tool:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

