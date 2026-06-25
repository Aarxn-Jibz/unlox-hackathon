import type { DocumentMetadata, CreateDocumentDTO } from '../../types';

interface DocumentRow {
  id: string;
  user_id: string;
  r2_key: string;
  name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

export class DocumentRepository {
  constructor(private db: D1Database) {}

  async findByUserId(userId: string): Promise<DocumentMetadata[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<DocumentRow>();

    return (results || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      r2Key: row.r2_key,
      name: row.name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async findById(id: string, userId: string): Promise<DocumentMetadata | null> {
    const row = await this.db
      .prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first<DocumentRow>();

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      r2Key: row.r2_key,
      name: row.name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findByR2Key(r2Key: string): Promise<DocumentMetadata | null> {
    const row = await this.db
      .prepare('SELECT * FROM documents WHERE r2_key = ?')
      .bind(r2Key)
      .first<DocumentRow>();

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      r2Key: row.r2_key,
      name: row.name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(userId: string, dto: CreateDocumentDTO): Promise<DocumentMetadata> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO documents (id, user_id, r2_key, name, file_size, mime_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, userId, dto.r2Key, dto.name, dto.fileSize, dto.mimeType, now, now)
      .run();

    return {
      id,
      userId,
      r2Key: dto.r2Key,
      name: dto.name,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      createdAt: now,
      updatedAt: now,
    };
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM documents WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();
    return result.success;
  }
}
