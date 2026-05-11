# 🔐 Google OAuth Setup Guide

Replace email/password authentication with Google Sign-In for seeksiddharth@gmail.com only.

## 🔑 Step 1: Get Google OAuth Credentials

### 1.1 Create Google Cloud Project
1. Go to **Google Cloud Console**: https://console.cloud.google.com/
2. Click on the **project dropdown** (top left)
3. Click **NEW PROJECT**
4. Name: `Mishra Family`
5. Click **CREATE**

### 1.2 Create OAuth 2.0 Credentials
1. Go to **Credentials** (left sidebar)
2. Click **+ CREATE CREDENTIALS**
3. Choose **OAuth client ID**
4. Select **Web application**
5. Name: `Mishra Family Web`
6. Under **Authorized JavaScript origins**, add:
   ```
   https://aadyadvait.com
   http://localhost:3006
   http://localhost:8000
   ```
7. Under **Authorized redirect URIs**, add:
   ```
   https://aadyadvait.com/auth-google.html
   http://localhost:3006/auth-google.html
   http://localhost:8000/auth-google.html
   ```
8. Click **CREATE**
9. Copy your **Client ID** (long string starting with numbers)

### 1.3 Enable Google Sign-In API
1. Go to **APIs & Services** (left sidebar)
2. Click **+ ENABLE APIS AND SERVICES**
3. Search for: `Google Identity`
4. Select **Google Identity Services**
5. Click **ENABLE**

## 🔧 Step 2: Update auth-google.html

Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Client ID:

```bash
# Find and replace in auth-google.html
sed -i '' 's/YOUR_GOOGLE_CLIENT_ID/YOUR_ACTUAL_CLIENT_ID/g' auth-google.html

# Example:
sed -i '' 's/YOUR_GOOGLE_CLIENT_ID/123456789-abcdefghijklmnop.apps.googleusercontent.com/g' auth-google.html
```

Or manually:
1. Open `auth-google.html` in text editor
2. Find: `data-client_id="YOUR_GOOGLE_CLIENT_ID"`
3. Replace with your actual Client ID
4. Save file

## 📝 Step 3: Configure Authorization

Only **seeksiddharth@gmail.com** can access:
- This is hardcoded in auth-google.html
- Change in code if needed:
  ```javascript
  AUTHORIZED_EMAIL: 'seeksiddharth@gmail.com',
  ```

## 🚀 Step 4: Deploy

### Option A: Update existing auth.html
```bash
# Backup old auth.html
cp auth.html auth-password.html.backup

# Replace with Google OAuth version
cp auth-google.html auth.html

# Commit and push
git add auth.html auth-google.html
git commit -m "Switch to Google OAuth authentication

- Replace email/password with Google Sign-In
- Only seeksiddharth@gmail.com has access
- Automatic session management
- Secure token-based auth"

git push origin main
```

### Option B: Keep both (use auth-google.html as default)
```bash
# Update ROOT_INDEX.html to redirect to auth-google.html
sed -i '' "s|auth.html|auth-google.html|g" ROOT_INDEX.html

git add ROOT_INDEX.html
git commit -m "Use Google OAuth as default auth"
git push origin main
```

## 🧪 Step 5: Test

### Local Testing
```bash
# Start local server
python3 -m http.server 8000

# Visit: http://localhost:8000/auth-google.html
# Click "Sign in with Google"
# Use: seeksiddharth@gmail.com
# ✓ Should authenticate
```

### Live Testing
```
https://aadyadvait.com/auth-google.html
```

## ✅ Features

- ✓ Google Sign-In button
- ✓ Automatic user info (name, email, picture)
- ✓ Email verification (only seeksiddharth@gmail.com)
- ✓ Session management (24 hours)
- ✓ Guest/Viewer mode (no Google needed)
- ✓ Auto-redirect to dashboard
- ✓ Logout clears session
- ✓ No passwords stored

## 🔒 Security

- OAuth token never stored
- Only email verified in localStorage
- 24-hour session timeout
- Guest mode available
- Redirect after logout
- HTTPS enforced

## 🐛 Troubleshooting

### "Sign in with Google" button not showing
- Check Client ID is correct (not "YOUR_GOOGLE_CLIENT_ID")
- Check JavaScript console for errors
- Verify domain is in authorized list
- Wait 5 minutes for Google config to sync

### "Access Denied" message
- Only seeksiddharth@gmail.com can login
- Check you're using correct email
- Guest access available without email

### "Invalid client" error
- Client ID is wrong
- Domain not authorized
- Create new credentials

### Session not persisting
- Check "Remember me" is checked
- Try clearing cookies
- Check browser allows localStorage

## 📋 Checklist

- [ ] Created Google Cloud Project
- [ ] Generated OAuth 2.0 credentials
- [ ] Got Client ID
- [ ] Enabled Google Identity Services API
- [ ] Updated Client ID in auth-google.html
- [ ] Added authorized domains/URIs
- [ ] Tested locally
- [ ] Deployed to aadyadvait.com
- [ ] Verified only seeksiddharth@gmail.com can access
- [ ] Tested logout
- [ ] Tested guest mode

## 🔗 Useful Links

- **Google Cloud Console**: https://console.cloud.google.com/
- **OAuth Setup Guide**: https://developers.google.com/identity/gsi/web
- **OAuth Scopes**: https://developers.google.com/identity/protocols/oauth2/scopes

---

**After setup:** Your family finance site now uses secure Google authentication! 🎉
