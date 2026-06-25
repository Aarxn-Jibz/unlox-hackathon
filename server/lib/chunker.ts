/**
 * Splits a given text into chunks of character size `chunkSize` with a sliding window
 * of `overlap` characters. This preserves semantic context across chunk boundaries.
 *
 * @param text - The raw text content to chunk.
 * @param chunkSize - Maximum number of characters per chunk. Default is 1024.
 * @param overlap - Number of characters to overlap between successive chunks. Default is 200.
 * @returns Array of chunked text strings.
 */
export function chunkText(text: string, chunkSize = 1024, overlap = 200): string[] {
  if (chunkSize <= 0) {
    throw new Error('chunkSize must be greater than 0');
  }
  if (overlap < 0 || overlap >= chunkSize) {
    throw new Error('overlap must be non-negative and strictly less than chunkSize');
  }
  if (!text) {
    return [];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    chunks.push(text.slice(startIndex, endIndex));

    // If we have reached or exceeded the end of the text, stop
    if (endIndex >= text.length) {
      break;
    }

    // Step forward by the non-overlapping portion of the chunkSize
    startIndex += chunkSize - overlap;
  }

  return chunks;
}
