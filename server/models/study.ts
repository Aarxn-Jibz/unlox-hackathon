import type { DocumentMetadata, Flashcard } from '../../types';

interface DocumentRow {
  id: string;
  user_id: string;
  name: string;
  file_size: number;
  mime_type: string;
  extracted_text: string | null;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

interface FlashcardRow {
  id: string;
  user_id: string;
  document_id: string | null;
  front: string;
  back: string;
  created_at: string;
  updated_at: string;
}

export async function createDocument(
  db: D1Database,
  userId: string,
  name: string,
  fileSize: number,
  mimeType: string,
): Promise<DocumentMetadata> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO documents (id, user_id, name, file_size, mime_type, extracted_text, chunk_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, 0, ?, ?)`,
    )
    .bind(id, userId, name, fileSize, mimeType, now, now)
    .run();
  return {
    id,
    userId,
    r2Key: '',
    name,
    fileSize,
    mimeType,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateDocumentText(
  db: D1Database,
  documentId: string,
  extractedText: string,
  chunkCount: number,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare('UPDATE documents SET extracted_text = ?, chunk_count = ?, updated_at = ? WHERE id = ?')
    .bind(extractedText, chunkCount, now, documentId)
    .run();
}

export async function getDocumentById(
  db: D1Database,
  documentId: string,
  userId: string,
): Promise<DocumentRow | null> {
  return db
    .prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
    .bind(documentId, userId)
    .first<DocumentRow>();
}

export async function getDocumentsByUserId(
  db: D1Database,
  userId: string,
): Promise<DocumentMetadata[]> {
  const { results } = await db
    .prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC')
    .bind(userId)
    .all<DocumentRow>();
  return (results || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    r2Key: '',
    name: row.name,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createFlashcard(
  db: D1Database,
  userId: string,
  documentId: string | null,
  front: string,
  back: string,
): Promise<Flashcard> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO flashcards (id, user_id, document_id, front, back, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, userId, documentId, front, back, now, now)
    .run();
  return { id, userId, documentId: documentId || undefined, front, back, createdAt: now, updatedAt: now };
}

export async function createFlashcardsBulk(
  db: D1Database,
  userId: string,
  documentId: string | null,
  cards: { front: string; back: string }[],
): Promise<Flashcard[]> {
  const now = new Date().toISOString();
  const results: Flashcard[] = [];
  for (const card of cards) {
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO flashcards (id, user_id, document_id, front, back, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, userId, documentId, card.front, card.back, now, now)
      .run();
    results.push({ id, userId, documentId: documentId || undefined, front: card.front, back: card.back, createdAt: now, updatedAt: now });
  }
  return results;
}

export async function getFlashcardsByUserId(
  db: D1Database,
  userId: string,
): Promise<Flashcard[]> {
  const { results } = await db
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

export async function getFlashcardsByDocumentId(
  db: D1Database,
  documentId: string,
  userId: string,
): Promise<Flashcard[]> {
  const { results } = await db
    .prepare('SELECT * FROM flashcards WHERE document_id = ? AND user_id = ? ORDER BY created_at ASC')
    .bind(documentId, userId)
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
