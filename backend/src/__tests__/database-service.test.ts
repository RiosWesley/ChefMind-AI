import { DatabaseService } from '../services/database-service';

describe('DatabaseService', () => {
  let db: DatabaseService;

  beforeAll(async () => {
    db = new DatabaseService();
    await db.initialize();
  });

  afterAll(async () => {
    await db.close();
  });

  it('should initialize database and create tables', async () => {
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tickets', 'messages', 'media')
      ORDER BY table_name
    `);

    expect(result.rows).toHaveLength(3);
    expect(result.rows.map((r: any) => r.table_name)).toEqual(['media', 'messages', 'tickets']);
  });

  it('should have correct ticket table structure', async () => {
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tickets'
      ORDER BY column_name
    `);

    const columns = result.rows.map((r: any) => r.column_name);
    expect(columns).toContain('id');
    expect(columns).toContain('contact_number');
    expect(columns).toContain('status');
    expect(columns).toContain('created_at');
    expect(columns).toContain('last_interaction_at');
    expect(columns).toContain('closed_at');
  });

  it('should have correct messages table structure', async () => {
    const result = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'messages'
      ORDER BY column_name
    `);

    const columns = result.rows.map((r: any) => r.column_name);
    expect(columns).toContain('id');
    expect(columns).toContain('ticket_id');
    expect(columns).toContain('contact_number');
    expect(columns).toContain('direction');
    expect(columns).toContain('message_type');
    expect(columns).toContain('content');
    expect(columns).toContain('media_id');
    expect(columns).toContain('waha_message_id');
    expect(columns).toContain('is_ai_generated');
    expect(columns).toContain('created_at');
  });

  it('should have correct media table structure', async () => {
    const result = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'media'
      ORDER BY column_name
    `);

    const columns = result.rows.map((r: any) => r.column_name);
    expect(columns).toContain('id');
    expect(columns).toContain('ticket_id');
    expect(columns).toContain('message_id');
    expect(columns).toContain('filename');
    expect(columns).toContain('mimetype');
    expect(columns).toContain('file_size');
    expect(columns).toContain('file_data');
    expect(columns).toContain('original_url');
    expect(columns).toContain('transcription');
    expect(columns).toContain('created_at');
  });
});




