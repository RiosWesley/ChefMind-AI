import dotenv from 'dotenv';
import { createServer } from './server';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);

createServer().then((app) => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});


