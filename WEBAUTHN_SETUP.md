# 🔐 WebAuthn Hardware Key Authentication Setup

Ultimate security: Only your registered hardware security key can unlock the site.

## ✨ Features

✅ **No passwords, no emails, no Google**
✅ Works with YubiKey, Windows Hello, Touch ID, Face ID, Android biometric
✅ Works offline
✅ Cannot be phished or hacked
✅ 256-bit encryption
✅ FIDO2 standard compliance

## 🔧 Supported Hardware

### USB Security Keys
- **YubiKey 5 Series** ⭐ (Most reliable)
  - YubiKey 5 NFC (works with phones too)
  - YubiKey 5C (USB-C)
  - YubiKey 5 Nano
  
- Titan Security Key
- Solokeys
- Nitrokey

### Built-in Authenticators
- **Windows Hello** (biometric/PIN)
- **Touch ID** (Mac/iPad)
- **Face ID** (Mac/iPhone)
- **Android Fingerprint** (Android 7+)
- **Windows PIN** (Windows 10+)

### NFC-enabled Keys
- YubiKey 5 NFC (can use with phones)
- Other FIDO2 NFC tags

## 📋 Step 1: Get a Hardware Key (Optional - already have one?)

### Best for Mishra Family: YubiKey 5 NFC
```
✓ USB: Works with computers
✓ NFC: Works with phones
✓ Portable
✓ Durable (5+ years)
✓ ~$45-60 USD
```

**Where to buy:**
- Yubico official: https://www.yubico.com/
- Amazon, Best Buy, local retailers

Or use **Windows Hello/Touch ID** if you prefer built-in biometric.

## 🚀 Step 2: Setup Hardware Authentication

### Option A: First-Time Setup (Register Your Key)

1. Visit: `https://aadyadvait.com/auth-webauthn.html`
2. Click **"Register Key"** tab
3. Enter key name (e.g., "YubiKey 5 NFC", "Touch ID")
4. Click **"Register New Key"**
5. **Insert your hardware key or use biometric**
6. ✅ Key registered!

### Option B: Already Have a Key?

If you already registered a key:

1. Visit: `https://aadyadvait.com/auth-webauthn.html`
2. Click **"Authenticate"** tab
3. Click **"Authenticate with Hardware Key"**
4. **Insert your key or use biometric**
5. ✅ Logged in!

## 🔑 Step 3: How It Works

### First Login (Registration)
```
You: "Register New Key"
   ↓
System: "Insert your hardware key"
   ↓
You: Insert YubiKey / use Touch ID
   ↓
Hardware: "Signs with private key" (stays secure on device)
   ↓
System: Stores public key (can't be hacked)
   ↓
✅ Key registered!
```

### Future Logins
```
You: "Authenticate with Hardware Key"
   ↓
System: "Insert your registered key"
   ↓
You: Insert YubiKey / use Touch ID
   ↓
Hardware: Confirms you with private key
   ↓
✅ Logged in!
```

## 🔒 Security Explained

### Why This is Secure

1. **Private Key Never Leaves Device**
   - Only hardware has the private key
   - Cannot be stolen or copied
   - Only you can use it

2. **Public Key Cannot Hack**
   - Server stores only public key
   - Cannot be reversed to get private key
   - Even if database hacked, keys are safe

3. **Cannot Be Phished**
   - Key only works on registered domain
   - Won't authenticate on fake sites
   - Attacker can't trick you

4. **Biometric + Hardware**
   - YubiKey + fingerprint = 2-factor
   - Stolen key is useless without your fingerprint
   - Lost key? Just register a new one

### What's NOT Secure

❌ Email/Password → Can be guessed, phished, forgotten
❌ Google OAuth → Trusts Google, not your key
❌ NFC Card alone → Can be cloned
❌ Phone app → Can be hacked if phone is compromised

✅ **Hardware Key** → Your private key on secure device, unhackable

## 📱 Platform Support

| Platform | Support | Method |
|----------|---------|--------|
| **Windows** | ✅ Excellent | Windows Hello + YubiKey |
| **Mac** | ✅ Excellent | Touch ID + YubiKey |
| **iPhone** | ✅ Good | Face ID + NFC YubiKey |
| **Android** | ✅ Good | Fingerprint + NFC YubiKey |
| **Chrome/Edge** | ✅ Full | USB YubiKey |
| **Firefox** | ✅ Full | USB YubiKey |
| **Safari** | ✅ Full | Touch ID / USB |

## 🔄 Step 4: Manage Your Keys

### Register Multiple Keys (Backup)

1. Go to **"Register Key"** tab
2. Enter second key name (e.g., "YubiKey Backup")
3. Register second key
4. Now you have 2 keys to login

**Why backup keys?**
- If one key is lost/broken, use the other
- Share with family members (each gets own key)
- Keep one at home, one at office

### Delete a Key

1. Go to **"Authenticate"** tab
2. See "🔑 Registered Keys" section
3. Click **"Delete"** next to the key
4. ✅ Key deleted

### Deactivate Without Deleting

If key is stolen but you still have another:
1. Delete the compromised key
2. Register a new key
3. Old key can't login anymore

## ⚙️ Enable WebAuthn Auth (Deploy)

### Step 1: Replace old auth.html
```bash
cp auth-webauthn.html auth.html
```

### Step 2: Commit and push
```bash
git add auth.html auth-webauthn.html
git commit -m "Switch to WebAuthn hardware key authentication"
git push origin main
```

### Step 3: Site auto-deploys ✅

Visit: `https://aadyadvait.com/auth.html`

## 🧪 Testing

### Local Testing
```bash
# Start local server
python3 -m http.server 8000

# Visit
http://localhost:8000/auth-webauthn.html

# Register and test your key
```

### Production Testing
```
https://aadyadvait.com/auth-webauthn.html

1. Click "Register Key"
2. Use your hardware key
3. Should see "Key registered successfully"
4. Go to "Authenticate" tab
5. Use the same key again
6. Should login ✅
```

## 🐛 Troubleshooting

### "WebAuthn not supported"
- Browser not compatible
- Use: Chrome, Firefox, Safari, or Edge
- Update browser to latest version
- Try different browser

### Key doesn't register
- Hardware key might not support FIDO2
- Older YubiKeys need firmware update
- Try with Windows Hello or Touch ID instead

### Can't login with registered key
- Make sure it's the same key
- Key might not be FIDO2 compatible
- Check browser console for error details

### Lost your only key
- Go to Guest access (read-only)
- Contact Siddharth to reset authentication

### Forgot which key is which
- The app shows registered key names
- Edit the name when registering
- Use clear names like "YubiKey #1", "Touch ID"

## 📋 Checklist

- [ ] Purchased hardware key (optional - use Touch ID instead)
- [ ] Visited auth-webauthn.html
- [ ] Registered first key
- [ ] Tested authentication with same key
- [ ] Registered backup key (optional)
- [ ] Deployed to production (auth.html)
- [ ] Tested on live site
- [ ] Shared info with family members

## 🔗 Resources

- **FIDO2 Overview**: https://fidoalliance.org/
- **YubiKey Docs**: https://docs.yubico.com/
- **WebAuthn Spec**: https://w3c.github.io/webauthn/
- **Browser Support**: https://caniuse.com/webauthn

## 🎉 You're Done!

Your family finance site is now protected by military-grade hardware security. 

Only your registered hardware key (YubiKey, Touch ID, Windows Hello, etc.) can access the system. No passwords, no emails, no Google - just pure cryptographic security.

---

**Questions?** Check auth-webauthn.html in your browser console for detailed error messages.
