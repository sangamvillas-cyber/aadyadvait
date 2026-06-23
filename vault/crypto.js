// vault/crypto.js
// Zero-knowledge crypto primitives. Web Crypto API only — no third-party code.
//
// Algorithms:
//   KDF:        PBKDF2-SHA256, 600,000 iterations  (OWASP 2023 minimum)
//   Cipher:     AES-256-GCM with 12-byte random IV
//   Format:     [12-byte IV][ciphertext + 16-byte GCM tag]
//   AAD:       file path (binds ciphertext to its location — prevents swap attacks)

(function (global) {
  const PBKDF2_ITERS = 600000;
  const KEY_BITS = 256;
  const IV_BYTES = 12;
  const SALT_BYTES = 16;
  const enc = new TextEncoder();

  async function deriveKey(passphrase, saltBytes) {
    const baseKey = await crypto.subtle.importKey(
      'raw', enc.encode(passphrase),
      { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: KEY_BITS },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptBytes(key, plainBytes, additionalDataString) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const params = { name: 'AES-GCM', iv };
    if (additionalDataString) params.additionalData = enc.encode(additionalDataString);
    const ct = new Uint8Array(await crypto.subtle.encrypt(params, key, plainBytes));
    const out = new Uint8Array(iv.length + ct.length);
    out.set(iv, 0);
    out.set(ct, iv.length);
    return out;
  }

  async function decryptBytes(key, blobBytes, additionalDataString) {
    const iv = blobBytes.slice(0, IV_BYTES);
    const ct = blobBytes.slice(IV_BYTES);
    const params = { name: 'AES-GCM', iv };
    if (additionalDataString) params.additionalData = enc.encode(additionalDataString);
    const plain = new Uint8Array(await crypto.subtle.decrypt(params, key, ct));
    return plain;
  }

  async function exportKeyB64(key) {
    const raw = await crypto.subtle.exportKey('raw', key);
    return b64encode(new Uint8Array(raw));
  }
  async function importKeyB64(b64) {
    const raw = b64decode(b64);
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  }

  function randomSalt() { return crypto.getRandomValues(new Uint8Array(SALT_BYTES)); }

  function b64encode(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function b64decode(s) {
    return Uint8Array.from(atob(s), c => c.charCodeAt(0));
  }

  global.Vault = {
    deriveKey, encryptBytes, decryptBytes,
    exportKeyB64, importKeyB64, randomSalt,
    b64encode, b64decode,
    PBKDF2_ITERS, KEY_BITS, IV_BYTES, SALT_BYTES,
  };
})(window);
