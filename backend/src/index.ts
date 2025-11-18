import dotenv from 'dotenv';
import { createServer } from './server';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = createServer();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});


