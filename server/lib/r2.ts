/// <reference types="@cloudflare/workers-types" />

/**
 * Uploads a file (File or Buffer) to the specified Cloudflare R2 bucket.
 * Uses native R2Bucket put() method.
 */
export async function uploadFile(
  file: File | Buffer,
  key: string,
  bucket: R2Bucket,
): Promise<R2Object> {
  const options: R2PutOptions = {};

  if (file instanceof File || file instanceof Blob) {
    options.httpMetadata = {
      contentType: file.type || 'application/octet-stream',
    };
  }

  const result = await bucket.put(key, file, options);
  if (!result) {
    throw new Error('R2 upload failed: bucket returned null/undefined');
  }
  return result;
}

/**
 * Returns the public or internal URL path for accessing a file by its key.
 * Can be configured using an environment variable if a custom domain is mapped.
 */
export function getFileUrl(key: string): string {
  // If an R2_PUBLIC_URL is specified (e.g. custom domain), use it; otherwise fallback to relative route
  const baseUrl = (typeof process !== 'undefined' && process.env?.R2_PUBLIC_URL) || '';
  if (baseUrl) {
    return `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}${key}`;
  }
  return `/api/files/${key}`;
}

/**
 * Deletes a file from the specified Cloudflare R2 bucket by its key.
 * Uses native R2Bucket delete() method.
 */
export async function deleteFile(key: string, bucket: R2Bucket): Promise<void> {
  await bucket.delete(key);
}
