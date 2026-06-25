/**
 * Native Web Crypto PBKDF2 Password Hashing and Verification
 * Supported across all modern runtimes including Cloudflare Workers.
 */

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordBuffer = new TextEncoder().encode(password);
  
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const derivedKeyBytes = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );
  
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(derivedKeyBytes)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [saltHex, originalHashHex] = parts;
    
    // Parse hex back to Uint8Array
    const salt = new Uint8Array((saltHex.match(/.{1,2}/g) || []).map(byte => parseInt(byte, 16)));
    const passwordBuffer = new TextEncoder().encode(password);
    
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const derivedKeyBytes = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      256
    );
    
    const hashHex = Array.from(new Uint8Array(derivedKeyBytes)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === originalHashHex;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}
