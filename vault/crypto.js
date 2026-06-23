// vault/crypto.js
// Zero-knowledge crypto primitives. Web Crypto API only — no third-party code.
//
// Model: a single random DEK (Data Encryption Key) encrypts every file.
// The DEK is wrapped under one or more KEKs (Key Encryption Keys):
//   - passphrase  → PBKDF2-SHA256(600k iters) → KEK
//   - WebAuthn PRF → HKDF-SHA256(prfOutput)   → KEK   (added after deploy)
//
// Cipher: AES-256-GCM, 12-byte random IV, AAD-bound to the logical path or
// purpose so ciphertexts can't be swapped between contexts.
// File format on disk: [12-byte IV][ciphertext+16-byte GCM tag]

(function (global) {
  const PBKDF2_ITERS = 600000;
  const KEY_BITS = 256;
  const IV_BYTES = 12;
  const SALT_BYTES = 16;
  const DEK_BYTES = 32;
  const enc = new TextEncoder();

  // ----- KDFs -----

  async function deriveKEKFromPassphrase(passphrase, saltBytes) {
    const baseKey = await crypto.subtle.importKey(
      'raw', enc.encode(passphrase),
      { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: KEY_BITS },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function deriveKEKFromPRF(prfOutputBytes, infoString) {
    const baseKey = await crypto.subtle.importKey(
      'raw', prfOutputBytes,
      { name: 'HKDF' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'HKDF', hash: 'SHA-256',
        salt: new Uint8Array(0),
        info: enc.encode(infoString || 'aadyadvait-vault-v1'),
      },
      baseKey,
      { name: 'AES-GCM', length: KEY_BITS },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // ----- DEK lifecycle -----

  function generateDEKBytes() {
    return crypto.getRandomValues(new Uint8Array(DEK_BYTES));
  }
  async function importDEK(rawBytes) {
    return crypto.subtle.importKey(
      'raw', rawBytes, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']
    );
  }
  async function exportDEKBytes(dekKey) {
    return new Uint8Array(await crypto.subtle.exportKey('raw', dekKey));
  }

  // ----- Symmetric encrypt/decrypt with AAD-binding -----

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
    return new Uint8Array(await crypto.subtle.decrypt(params, key, ct));
  }

  // ----- DEK wrap/unwrap helpers (sugar over encryptBytes/decryptBytes) -----
  // wrappedDEK = encryptBytes(KEK, rawDEKbytes, 'vault.dek.v1')

  async function wrapDEK(kekKey, dekRawBytes) {
    return encryptBytes(kekKey, dekRawBytes, 'vault.dek.v1');
  }
  async function unwrapDEK(kekKey, wrappedBytes) {
    return decryptBytes(kekKey, wrappedBytes, 'vault.dek.v1');
  }

  // ----- Canary (proves the unwrapped DEK is the real one) -----

  async function makeCanary(dekKey) {
    const payload = enc.encode('vault-ok-' + new Date().toISOString());
    return encryptBytes(dekKey, payload, 'vault.canary.v1');
  }
  async function checkCanary(dekKey, canaryBytes) {
    await decryptBytes(dekKey, canaryBytes, 'vault.canary.v1');
    return true;
  }

  // ----- Utility -----

  function randomSalt() { return crypto.getRandomValues(new Uint8Array(SALT_BYTES)); }
  function randomChallenge() { return crypto.getRandomValues(new Uint8Array(32)); }

  function b64encode(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function b64decode(s) {
    return Uint8Array.from(atob(s), c => c.charCodeAt(0));
  }
  function b64urlencode(bytes) {
    return b64encode(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  global.Vault = {
    deriveKEKFromPassphrase, deriveKEKFromPRF,
    generateDEKBytes, importDEK, exportDEKBytes,
    encryptBytes, decryptBytes,
    wrapDEK, unwrapDEK,
    makeCanary, checkCanary,
    randomSalt, randomChallenge,
    b64encode, b64decode, b64urlencode,
    PBKDF2_ITERS, KEY_BITS, IV_BYTES, SALT_BYTES, DEK_BYTES,
  };
})(window);
