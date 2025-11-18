import { Router, Request, Response } from 'express';
import { ToolService } from '../services/tool-service';

export const createToolsRouter = (toolService: ToolService): Router => {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    try {
      const tools = toolService.getAvailableTools();
      res.json({ tools });
    } catch (error) {
      console.error('Error getting tools:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

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

