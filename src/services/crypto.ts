/**
 * FAHGIT Cryptographic Security Engine
 * Uses Web Crypto API: PBKDF2 (SHA-256, 100,000 iterations) + AES-GCM 256-bit.
 * Zero plaintext leakage, random salt + IV per encryption.
 */

export interface EncryptedPayload {
  salt: string;        // Base64
  iv: string;          // Base64
  ciphertext: string;  // Base64
  tokenHint: string;   // e.g. "ghp_***4a9f"
}

// Convert ArrayBuffer to Base64 string
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 string to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive AES-GCM 256-bit Key from Master Passphrase and Salt using PBKDF2
async function deriveKey(passphrase: string, saltBuffer: ArrayBuffer): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passphraseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a GitHub Personal Access Token using AES-GCM
 */
export async function encryptToken(token: string, passphrase: string): Promise<EncryptedPayload> {
  if (!token.trim()) {
    throw new Error('Personal Access Token cannot be empty.');
  }
  if (!passphrase || passphrase.length < 6) {
    throw new Error('Master Passphrase must be at least 6 characters.');
  }

  // 1. Generate 16 bytes cryptographically secure random salt
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  // 2. Generate 12 bytes cryptographically secure random IV for AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 3. Derive key
  const key = await deriveKey(passphrase, salt.buffer);

  // 4. Encrypt token
  const enc = new TextEncoder();
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    enc.encode(token)
  );

  // 5. Generate safe token hint for UI
  const trimmed = token.trim();
  let tokenHint = 'Token configured';
  if (trimmed.length > 8) {
    tokenHint = `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
  }

  return {
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(ciphertextBuffer),
    tokenHint,
  };
}

/**
 * Decrypt a GitHub Personal Access Token using AES-GCM and Master Passphrase
 */
export async function decryptToken(payload: { salt: string; iv: string; ciphertext: string }, passphrase: string): Promise<string> {
  if (!passphrase) {
    throw new Error('Master Passphrase is required to unlock.');
  }

  try {
    const saltBuffer = base64ToBuffer(payload.salt);
    const ivBuffer = base64ToBuffer(payload.iv);
    const ciphertextBuffer = base64ToBuffer(payload.ciphertext);

    const key = await deriveKey(passphrase, saltBuffer);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(ivBuffer),
      },
      key,
      ciphertextBuffer
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch {
    throw new Error('Incorrect Master Passphrase or corrupted credentials.');
  }
}
