// vault/lock.js
// Master unlock gate. Loads vault/meta.json, presents the available
// unlock methods (passphrase + any registered WebAuthn credentials),
// unwraps the DEK, caches it in sessionStorage (tab-scoped).
//
// Usage in a page:
//   <script src="vault/crypto.js"></script>
//   <script src="vault/lock.js"></script>
//   <script>
//     const id  = await Vault.lock.loadIdentity();
//     const url = await Vault.lock.loadAsset('aadhaar/sheoshyam-aadhaar.pdf');
//   </script>

(function (global) {
  const META_URL = 'vault/meta.json';
  const DEK_CACHE_KEY = 'vault.dek.b64';

  let cachedDEK = null;          // CryptoKey
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
    if (cachedDEK) return cachedDEK;
    const b64 = sessionStorage.getItem(DEK_CACHE_KEY);
    if (b64) {
      try {
        cachedDEK = await Vault.importDEK(Vault.b64decode(b64));
        return cachedDEK;
      } catch { sessionStorage.removeItem(DEK_CACHE_KEY); }
    }
    if (!pendingUnlock) pendingUnlock = openLockScreen().finally(() => { pendingUnlock = null; });
    return pendingUnlock;
  }

  function openLockScreen() {
    return new Promise(async (resolve, reject) => {
      let meta;
      try { meta = await loadMeta(); }
      catch (e) { reject(e); return; }

      const canary = Vault.b64decode(meta.canary);
      const wrappers = meta.wrappers || [];
      const hardwareWrappers = wrappers.filter(w => w.kind === 'webauthn');
      const passphraseWrapper = wrappers.find(w => w.kind === 'passphrase');

      const overlay = document.createElement('div');
      overlay.id = 'vaultLockOverlay';
      overlay.style.cssText = [
        'position:fixed','inset:0','background:#1A1410','color:#F5F0E8',
        'display:flex','align-items:center','justify-content:center',
        'z-index:99999','font-family:-apple-system,system-ui,sans-serif',
      ].join(';');
      const hardwareBtnHtml = hardwareWrappers.length
        ? `<button id="vaultHwBtn" type="button" style="width:100%;padding:0.875rem;border-radius:0.5rem;border:none;background:#C66B2F;color:white;font-size:0.9375rem;font-weight:600;cursor:pointer;margin-bottom:0.75rem;">Use security key / Touch ID</button>
           <div style="text-align:center;color:#7A6E5C;font-size:0.8125rem;margin:0.5rem 0 1rem;">or</div>`
        : '';
      const passphraseFormHtml = passphraseWrapper
        ? `<form id="vaultPwForm">
             <input id="vaultPwInput" type="password" autocomplete="current-password" autofocus
               style="width:100%;padding:0.75rem 1rem;border-radius:0.5rem;border:1px solid #4A3E33;background:#1A1410;color:#F5F0E8;font-size:1rem;box-sizing:border-box;outline:none;"
               placeholder="${hardwareWrappers.length ? 'Backup passphrase' : 'Master passphrase'}">
             <div id="vaultPwError" style="display:none;color:#E27D7D;font-size:0.8125rem;margin-top:0.625rem;"></div>
             <button id="vaultPwSubmit" type="submit"
               style="margin-top:0.875rem;width:100%;padding:0.75rem;border-radius:0.5rem;border:1px solid #4A3E33;background:transparent;color:#F5F0E8;font-size:0.9375rem;font-weight:600;cursor:pointer;">Unlock with passphrase</button>
           </form>`
        : '<p style="color:#E27D7D;">No passphrase wrapper found. Add a credential via vault/enroll.html.</p>';

      overlay.innerHTML = `
        <div style="background:#2A1F18;padding:2.25rem;border-radius:0.75rem;max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
          <h2 style="margin:0 0 0.5rem 0;font-size:1.25rem;font-weight:600;">Mishra Family Vault</h2>
          <p style="margin:0 0 1.5rem 0;color:#A89F95;font-size:0.875rem;line-height:1.5;">Authenticate to decrypt family records.</p>
          ${hardwareBtnHtml}
          ${passphraseFormHtml}
        </div>
      `;
      document.body.appendChild(overlay);

      const finishWithDEK = async (dekKey) => {
        try { await Vault.checkCanary(dekKey, canary); }
        catch { throw new Error('Canary check failed — wrong key or vault corrupted'); }
        cachedDEK = dekKey;
        const raw = await Vault.exportDEKBytes(dekKey);
        sessionStorage.setItem(DEK_CACHE_KEY, Vault.b64encode(raw));
        overlay.remove();
        resolve(dekKey);
      };

      // ---- passphrase path ----
      if (passphraseWrapper) {
        const form = overlay.querySelector('#vaultPwForm');
        const input = overlay.querySelector('#vaultPwInput');
        const errEl = overlay.querySelector('#vaultPwError');
        const submit = overlay.querySelector('#vaultPwSubmit');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          errEl.style.display = 'none';
          submit.disabled = true;
          submit.textContent = 'Unlocking…';
          try {
            const salt = Vault.b64decode(passphraseWrapper.salt);
            const kek = await Vault.deriveKEKFromPassphrase(input.value, salt);
            const dekRaw = await Vault.unwrapDEK(kek, Vault.b64decode(passphraseWrapper.wrappedDEK));
            const dekKey = await Vault.importDEK(dekRaw);
            await finishWithDEK(dekKey);
          } catch {
            submit.disabled = false;
            submit.textContent = 'Unlock with passphrase';
            errEl.textContent = 'Incorrect passphrase.';
            errEl.style.display = 'block';
            input.select();
          }
        });
      }

      // ---- hardware path ----
      if (hardwareWrappers.length) {
        overlay.querySelector('#vaultHwBtn').addEventListener('click', async () => {
          const btn = overlay.querySelector('#vaultHwBtn');
          btn.disabled = true; btn.textContent = 'Touch your authenticator…';
          try {
            const allowCredentials = hardwareWrappers.map(w => ({
              type: 'public-key',
              id: Vault.b64decode(w.credentialId),
            }));
            const prfInput = new TextEncoder().encode(meta.prfInput || 'aadyadvait-vault-master-v1');
            const assertion = await navigator.credentials.get({
              publicKey: {
                challenge: Vault.randomChallenge(),
                rpId: meta.rpId,
                allowCredentials,
                userVerification: 'required',
                extensions: { prf: { eval: { first: prfInput } } },
              },
            });
            const ext = assertion.getClientExtensionResults();
            if (!ext.prf || !ext.prf.results || !ext.prf.results.first) {
              throw new Error('This authenticator did not return a PRF output. Try a different one or use the backup passphrase.');
            }
            const prfOut = new Uint8Array(ext.prf.results.first);
            const credIdB64 = Vault.b64encode(new Uint8Array(assertion.rawId));
            const wrapper = hardwareWrappers.find(w => w.credentialId === credIdB64);
            if (!wrapper) throw new Error('Authenticator not registered with this vault.');
            const kek = await Vault.deriveKEKFromPRF(prfOut, 'aadyadvait-vault-v1');
            const dekRaw = await Vault.unwrapDEK(kek, Vault.b64decode(wrapper.wrappedDEK));
            const dekKey = await Vault.importDEK(dekRaw);
            await finishWithDEK(dekKey);
          } catch (e) {
            btn.disabled = false;
            btn.textContent = 'Use security key / Touch ID';
            console.error(e);
            alert('Hardware unlock failed: ' + (e.message || e));
          }
        });
      }
    });
  }

  async function loadIdentity() {
    const dek = await ensureUnlocked();
    const r = await fetch('vault/identity.enc?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('Cannot fetch vault/identity.enc');
    const bytes = new Uint8Array(await r.arrayBuffer());
    const plain = await Vault.decryptBytes(dek, bytes, 'family-identity.json');
    return JSON.parse(new TextDecoder().decode(plain));
  }

  const blobUrlCache = new Map();
  async function loadAsset(path) {
    if (blobUrlCache.has(path)) return blobUrlCache.get(path);
    const dek = await ensureUnlocked();
    const r = await fetch(path + '.enc?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('Cannot fetch ' + path + '.enc');
    const bytes = new Uint8Array(await r.arrayBuffer());
    const plain = await Vault.decryptBytes(dek, bytes, path);
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
    cachedDEK = null;
    cachedMeta = null;
    sessionStorage.removeItem(DEK_CACHE_KEY);
    for (const u of blobUrlCache.values()) URL.revokeObjectURL(u);
    blobUrlCache.clear();
  }

  global.Vault.lock = { ensureUnlocked, loadIdentity, loadAsset, lock };
})(window);
