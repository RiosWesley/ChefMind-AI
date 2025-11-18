import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://default:default@localhost:5432/test_db';
process.env.WAHA_API_URL = process.env.WAHA_API_URL || 'http://localhost:3000';
process.env.WAHA_API_KEY = process.env.WAHA_API_KEY || 'test-key';
process.env.WHISPER_API_URL = process.env.WHISPER_API_URL || 'http://localhost:9000';
process.env.N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';

