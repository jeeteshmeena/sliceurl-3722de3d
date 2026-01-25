/**
 * End-to-End Encryption Utilities
 * 
 * Client-side AES-256-GCM encryption for SliceBox/LittleSlice files.
 * Server never sees raw file data.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

export interface EncryptionResult {
  encryptedData: ArrayBuffer;
  key: string; // Base64-encoded key derivation info
  iv: string; // Base64-encoded IV
}

export interface DecryptionParams {
  encryptedData: ArrayBuffer;
  key: string;
  iv: string;
}

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a random encryption key
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export CryptoKey to base64 string for URL fragment
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const rawKey = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(rawKey);
}

/**
 * Import base64 key string back to CryptoKey
 */
export async function importKey(keyBase64: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyBase64);
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // not extractable
    ['decrypt']
  );
}

/**
 * Encrypt file data with AES-256-GCM
 */
export async function encryptFile(data: ArrayBuffer): Promise<{ encrypted: ArrayBuffer; key: string; iv: string }> {
  // Generate random key and IV
  const key = await generateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  // Encrypt the data
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );
  
  // Export key for URL fragment
  const keyBase64 = await exportKey(key);
  const ivBase64 = arrayBufferToBase64(iv.buffer);
  
  return {
    encrypted,
    key: keyBase64,
    iv: ivBase64,
  };
}

/**
 * Decrypt file data with AES-256-GCM
 */
export async function decryptFile(
  encryptedData: ArrayBuffer, 
  keyBase64: string, 
  ivBase64: string
): Promise<ArrayBuffer> {
  const key = await importKey(keyBase64);
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  
  return crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encryptedData
  );
}

/**
 * Encrypt a File object and return encrypted blob with metadata
 */
export async function encryptFileObject(file: File): Promise<{
  encryptedBlob: Blob;
  key: string;
  iv: string;
  originalSize: number;
  originalType: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const { encrypted, key, iv } = await encryptFile(arrayBuffer);
  
  return {
    encryptedBlob: new Blob([encrypted], { type: 'application/octet-stream' }),
    key,
    iv,
    originalSize: file.size,
    originalType: file.type || 'application/octet-stream',
  };
}

/**
 * Decrypt and reconstruct a File object
 */
export async function decryptToFile(
  encryptedData: ArrayBuffer,
  keyBase64: string,
  ivBase64: string,
  fileName: string,
  mimeType: string
): Promise<File> {
  const decrypted = await decryptFile(encryptedData, keyBase64, ivBase64);
  return new File([decrypted], fileName, { type: mimeType });
}

/**
 * Decrypt to Blob for display/preview
 */
export async function decryptToBlob(
  encryptedData: ArrayBuffer,
  keyBase64: string,
  ivBase64: string,
  mimeType: string
): Promise<Blob> {
  const decrypted = await decryptFile(encryptedData, keyBase64, ivBase64);
  return new Blob([decrypted], { type: mimeType });
}
