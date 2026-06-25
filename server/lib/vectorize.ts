/// <reference types="@cloudflare/workers-types" />

export interface VectorInput {
  id: string;
  values: number[];
  metadata?: Record<string, string | number | boolean | string[]>;
}

/**
 * Upserts an array of vectors into the Vectorize index.
 * Uses native VectorizeIndex.upsert() method.
 */
export async function upsertVectors(
  vectors: VectorInput[],
  index: VectorizeIndex,
): Promise<VectorizeVectorMutation> {
  const result = await index.upsert(vectors);
  return result;
}

/**
 * Queries the Vectorize index for similar vectors.
 * Uses native VectorizeIndex.query() method.
 */
export async function queryVectors(
  vector: number[],
  topK: number,
  index: VectorizeIndex,
): Promise<VectorizeMatches> {
  const result = await index.query(vector, {
    topK,
    returnValues: true,
    returnMetadata: true,
  });
  return result;
}
