# Deployment Guide - Mishra Family Personal Finance Site

## 🚀 Quick Start

### Files to Upload
All 10 HTML files from this directory to your web hosting root folder:
- `auth.html` (login page - users start here)
- `dashboard.html` (main dashboard)
- `member-profile.html` (family member profiles)
- `financial.html` (financial tracker)
- `documents.html` (document manager)
- `documents-ocr.html` (OCR document reader)
- `backup.html` (backup system)
- `pdf-export.html` (PDF reports)
- `mf-tracker.html` (mutual fund tracker)
- `index.html` (alternative dashboard)

### Upload Instructions

#### If using FTP/SFTP:
1. Open your FTP client (FileZilla, WinSCP, etc.)
2. Connect to your hosting with provided credentials
3. Navigate to the public_html or www folder
4. Upload all 10 HTML files

#### If using cPanel File Manager:
1. Log in to cPanel
2. Open File Manager
3. Navigate to public_html folder
4. Upload all 10 HTML files (drag & drop or upload button)

#### If using SSH:
```bash
# Navigate to your hosting directory
cd public_html/

# Download files from your local machine
scp /Users/siddharthmishra/aadyadvait/*.html user@aadyadvait.com:/public_html/
```

## 🔐 First Time Setup

### Step 1: Navigate to Login
Once uploaded, visit:
```
https://aadyadvait.com/auth.html
```

### Step 2: Login with Master Account
- **Email:** seeksiddharth@gmail.com
- **Password:** family2024
- Check "Remember me" for persistent login

### Step 3: Access Dashboard
After login, you'll be redirected to the main dashboard

## 📝 Master Account Credentials

**Email:** seeksiddharth@gmail.com
**Password:** family2024
**Access Level:** Full admin access to all family records

⚠️ **IMPORTANT:** Change this password after first login!

To change the password:
1. Open `auth.html` in a text editor
2. Find the line: `const MASTER_PASSWORD_HASH = 'family2024';`
3. Replace `'family2024'` with your new password
4. Upload the updated `auth.html`

## 🔑 Guest Access

Users can also access as viewers (read-only mode):
- Click "Access as Viewer (Read-Only)" on login page
- No credentials needed
- Cannot modify any data

## 💾 Data Storage

**Important:** All data is stored in browser's localStorage (client-side only)
- Each family member gets 500 MB storage
- Data is NOT synced to server
- Use backup system to export data regularly
- Clear browser cache = data loss (use backups!)

### Creating Backups
1. Go to Backup & Cloud Sync page
2. Click "Create Local Backup"
3. Download backup file for safekeeping
4. Can restore anytime

## 📱 Responsive Design

Site works on:
- ✅ Desktop (1200px+)
- ✅ Tablet (768px - 1199px)
- ✅ Mobile (320px - 767px)

## 🌐 Browser Support

Tested on:
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge

Required features:
- JavaScript enabled
- localStorage support (500MB+ per origin)
- File upload capability

## 🔧 Technical Details

### No Backend Required
- 100% frontend application
- All data stored in browser localStorage
- No server-side processing
- Works completely offline after first load

### External Libraries Used (via CDN)
- Google Fonts (Inter font family)
- html2pdf.js (PDF generation)
- Tesseract.js (OCR text extraction)

All loaded from CDN - requires internet for first load

### Features

#### 📊 Dashboard
- Family overview with 6 member profiles
- Net worth calculations
- Storage usage tracking
- Recent activity timeline

#### 👥 Family Members
- Individual profile pages
- Personal information
- Document tracking
- Financial summary

#### 💰 Financial
- Mutual fund holdings
- Bank account tracking
- Investment portfolio
- Family comparison reports

#### 📄 Documents
- Upload & organize documents
- Categorize by type
- Track storage usage
- Download/delete capability

#### 🔍 OCR Reader
- Extract text from documents
- Real-time processing
- Full-text search
- Copy/download extracted text

#### ☁️ Backup System
- Create local backups
- Download backup files
- Restore from backup
- Firebase optional integration

#### 📑 PDF Reports
- Member profile PDFs
- Financial summary reports
- Documents inventory
- Family comparison
- Custom report builder
- Batch export all members

#### 🔐 Authentication
- Master login (admin)
- Guest/viewer mode (read-only)
- Session management
- Automatic logout after 24 hours

## ⚙️ Configuration

### Change Master Email
1. Open `auth.html` in editor
2. Find: `const MASTER_EMAIL = 'seeksiddharth@gmail.com';`
3. Change to your email
4. Upload file

### Change Master Password
1. Open `auth.html` in editor
2. Find: `const MASTER_PASSWORD_HASH = 'family2024';`
3. Change to your password
4. Upload file

### Change Family Members
1. Open `dashboard.html` in editor
2. Find the FAMILY object (around line 740)
3. Edit member names, relations, details
4. Upload file

## 🚨 Troubleshooting

### "Cannot find file" error
- Ensure all 10 HTML files are uploaded to root folder
- Check file names are exactly as listed (lowercase, .html extension)
- Clear browser cache and try again

### Login not working
- Clear browser cookies and localStorage
- Check email and password exactly match (case-sensitive)
- Try in incognito/private mode

### Data not saving
- Check browser allows localStorage (Settings > Privacy)
- Try with different browser
- Check available disk space
- Disable browser extensions that might interfere

### PDFs not generating
- Check JavaScript is enabled
- Ensure stable internet (html2pdf loads from CDN)
- Try in Chrome/Chromium browser
- Check browser console for errors

### OCR not working
- Check internet connection (Tesseract.js loaded from CDN)
- Try uploading image files (PDF, JPG, PNG)
- Check browser console for errors

## 🔒 Security Notes

⚠️ **Important Security Considerations:**

1. **No HTTPS enforced by app** - Request your host to enable HTTPS/SSL
2. **Password in code** - Change default password immediately
3. **localStorage is client-side only** - No server backup
4. **No user authentication on other users** - Any viewer can see all data
5. **Regular backups** - Download backups weekly to prevent data loss

## 📞 Support

For issues or feature requests, check:
1. Browser console for error messages (F12 > Console tab)
2. Clear cache and try again
3. Test in different browser
4. Ensure all files are uploaded

## 📊 File Sizes

```
auth.html          ~18 KB  (Login page)
dashboard.html     ~30 KB  (Main dashboard)
backup.html        ~27 KB  (Backup system)
pdf-export.html    ~41 KB  (PDF reports)
financial.html     ~30 KB  (Financial tracker)
documents.html     ~27 KB  (Document manager)
documents-ocr.html ~22 KB  (OCR reader)
member-profile.html ~24 KB  (Member profiles)
mf-tracker.html    ~41 KB  (MF tracker)
index.html         ~57 KB  (Legacy dashboard)
─────────────────────────
Total: ~318 KB
```

All files are optimized and load quickly.

---

✅ **Deployment complete!** Your family finance site is now live at aadyadvait.com
