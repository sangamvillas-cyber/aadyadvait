// vault/lock.js
// Master-passphrase gate for pages that need decrypted data.
// Requires vault/crypto.js loaded first.
//
// Usage in a page:
//   <script src="vault/crypto.js"></script>
//   <script src="vault/lock.js"></script>
//   <script>
//     const identity = await Vault.lock.loadIdentity();
//     const url = await Vault.lock.loadAsset('aadhaar/sheoshyam-aadhaar.pdf');
//   </script>
//
// Derived key is cached in sessionStorage (tab-scoped, evicted on tab close).

(function (global) {
  const META_URL = 'vault/meta.json';
  const KEY_CACHE_KEY = 'vault.key.b64';

  let cachedKey = null;
  let cachedMeta = null;
  let pendingUnlock = null;

  async function loadMeta() {
    if (cachedMeta) return cachedMeta;
    const r = await fetch(META_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('Vault not initialised. Run vault/setup.html first.');
    cachedMeta = await r.json();
    return cachedMeta;
  }

  async function ensureUnlocked() {
    if (cachedKey) return cachedKey;
    const b64 = sessionStorage.getItem(KEY_CACHE_KEY);
    if (b64) {
      try {
        cachedKey = await Vault.importKeyB64(b64);
        return cachedKey;
      } catch { sessionStorage.removeItem(KEY_CACHE_KEY); }
    }
    if (!pendingUnlock) pendingUnlock = openLockScreen().finally(() => { pendingUnlock = null; });
    return pendingUnlock;
  }

  function openLockScreen() {
    return new Promise(async (resolve, reject) => {
      let meta;
      try { meta = await loadMeta(); }
      catch (e) { reject(e); return; }
      const salt = Vault.b64decode(meta.salt);
      const canary = Vault.b64decode(meta.canary);

      const overlay = document.createElement('div');
      overlay.id = 'vaultLockOverlay';
      overlay.style.cssText = [
        'position:fixed', 'inset:0', 'background:#1A1410', 'color:#F5F0E8',
        'display:flex', 'align-items:center', 'justify-content:center',
        'z-index:99999', 'font-family:-apple-system,system-ui,sans-serif',
      ].join(';');
      overlay.innerHTML = `
        <form id="vaultLockForm" style="background:#2A1F18;padding:2.5rem;border-radius:0.75rem;max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
          <h2 style="margin:0 0 0.5rem 0;font-size:1.25rem;font-weight:600;">Mishra Family Vault</h2>
          <p style="margin:0 0 1.5rem 0;color:#A89F95;font-size:0.875rem;line-height:1.5;">Enter your master passphrase to decrypt family records.</p>
          <input id="vaultPwInput" type="password" autocomplete="current-password" autofocus
            style="width:100%;padding:0.75rem 1rem;border-radius:0.5rem;border:1px solid #4A3E33;background:#1A1410;color:#F5F0E8;font-size:1rem;box-sizing:border-box;outline:none;"
            placeholder="Master passphrase">
          <div id="vaultPwError" style="display:none;color:#E27D7D;font-size:0.8125rem;margin-top:0.625rem;"></div>
          <button id="vaultPwSubmit" type="submit"
            style="margin-top:1rem;width:100%;padding:0.75rem;border-radius:0.5rem;border:none;background:#C66B2F;color:white;font-size:0.9375rem;font-weight:600;cursor:pointer;">Unlock</button>
        </form>
      `;
      document.body.appendChild(overlay);
      const form = overlay.querySelector('#vaultLockForm');
      const input = overlay.querySelector('#vaultPwInput');
      const errEl = overlay.querySelector('#vaultPwError');
      const submit = overlay.querySelector('#vaultPwSubmit');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.style.display = 'none';
        submit.disabled = true;
        submit.textContent = 'Unlocking…';
        try {
          const key = await Vault.deriveKey(input.value, salt);
          await Vault.decryptBytes(key, canary, 'vault.canary');
          cachedKey = key;
          sessionStorage.setItem(KEY_CACHE_KEY, await Vault.exportKeyB64(key));
          overlay.remove();
          resolve(key);
        } catch {
          submit.disabled = false;
          submit.textContent = 'Unlock';
          errEl.textContent = 'Incorrect passphrase.';
          errEl.style.display = 'block';
          input.select();
        }
      });
    });
  }

  async function loadIdentity() {
    const key = await ensureUnlocked();
    const r = await fetch('vault/identity.enc?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('Cannot fetch vault/identity.enc');
    const bytes = new Uint8Array(await r.arrayBuffer());
    const plain = await Vault.decryptBytes(key, bytes, 'family-identity.json');
    return JSON.parse(new TextDecoder().decode(plain));
  }

  const blobUrlCache = new Map();
  async function loadAsset(path) {
    if (blobUrlCache.has(path)) return blobUrlCache.get(path);
    const key = await ensureUnlocked();
    const r = await fetch(path + '.enc?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('Cannot fetch ' + path + '.enc');
    const bytes = new Uint8Array(await r.arrayBuffer());
    const plain = await Vault.decryptBytes(key, bytes, path);
    const mime = guessMime(path);
    const url = URL.createObjectURL(new Blob([plain], { type: mime }));
    blobUrlCache.set(path, url);
    return url;
  }

  function guessMime(path) {
    const ext = path.split('.').pop().toLowerCase();
    return ({
      pdf: 'application/pdf',
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
      json: 'application/json', txt: 'text/plain',
    })[ext] || 'application/octet-stream';
  }

  function lock() {
    cachedKey = null;
    cachedMeta = null;
    sessionStorage.removeItem(KEY_CACHE_KEY);
    for (const u of blobUrlCache.values()) URL.revokeObjectURL(u);
    blobUrlCache.clear();
  }

  global.Vault.lock = { ensureUnlocked, loadIdentity, loadAsset, lock };
})(window);
