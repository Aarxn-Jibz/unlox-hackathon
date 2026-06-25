import type { Flashcard, CreateFlashcardDTO } from '../../types';

interface FlashcardRow {
  id: string;
  user_id: string;
  document_id: string | null;
  front: string;
  back: string;
  created_at: string;
  updated_at: string;
}

export class FlashcardRepository {
  constructor(private db: D1Database) {}

  async findByUserId(userId: string): Promise<Flashcard[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM flashcards WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<FlashcardRow>();

    return (results || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      documentId: row.document_id || undefined,
      front: row.front,
      back: row.back,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async findByDocumentId(userId: string, documentId: string): Promise<Flashcard[]> {
    const { results } = await this.db
      .prepare(
        'SELECT * FROM flashcards WHERE user_id = ? AND document_id = ? ORDER BY created_at DESC',
      )
      .bind(userId, documentId)
      .all<FlashcardRow>();

    return (results || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      documentId: row.document_id || undefined,
      front: row.front,
      back: row.back,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async create(userId: string, dto: CreateFlashcardDTO): Promise<Flashcard> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO flashcards (id, user_id, document_id, front, back, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, userId, dto.documentId || null, dto.front, dto.back, now, now)
      .run();

    return {
      id,
      userId,
      documentId: dto.documentId,
      front: dto.front,
      back: dto.back,
      createdAt: now,
      updatedAt: now,
    };
  }

  async bulkCreate(userId: string, dtos: CreateFlashcardDTO[]): Promise<Flashcard[]> {
    if (dtos.length === 0) return [];

    const now = new Date().toISOString();
    const createdCards: Flashcard[] = [];
    const statements: D1PreparedStatement[] = [];

    const insertStmt = this.db.prepare(
      `INSERT INTO flashcards (id, user_id, document_id, front, back, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const dto of dtos) {
      const id = crypto.randomUUID();
      const documentId = dto.documentId || null;

      statements.push(insertStmt.bind(id, userId, documentId, dto.front, dto.back, now, now));

      createdCards.push({
        id,
        userId,
        documentId: dto.documentId,
        front: dto.front,
        back: dto.back,
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.db.batch(statements);
    return createdCards;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM flashcards WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();
    return result.success;
  }
}
