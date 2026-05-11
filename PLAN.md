# Mishra Family Personal Website - Complete Architecture Plan

## FAMILY STRUCTURE & ACCESS CONTROL

```
Master Login: Siddharth (seeksiddharth@gmail.com)
├── Full Admin Access (Read + Write + Delete + Manage)
├── Can edit all family members' data
├── Can manage storage & backups
├── Can delete/archive records
└── Can export family reports

Monitoring Only (Read-Only):
├── Archana (Mother) - View all family data
├── Aadya (Daughter) - View all family data
├── Advait (Son) - View all family data
├── Sarla Mishra (Grandmother) - View all family data
└── Sheo Shyam Mishra (Grandfather) - View all family data
```

---

## DATA MODEL

### Family Members (6 people)
1. Siddharth - Father
2. Archana - Mother
3. Aadya - Daughter
4. Advait - Son
5. Sarla Mishra - Paternal Grandmother
6. Sheo Shyam Mishra - Paternal Grandfather

### Data Structure Per Member

```javascript
{
  id: "member_id",
  name: "Name",
  relation: "Father|Mother|Daughter|Son|Grandmother|Grandfather",
  icon: "emoji",
  contact: {
    email: "email@domain.com",
    phone: "phone number",
    address: "address",
    dateOfBirth: "YYYY-MM-DD"
  },
  financial: {
    mutualFunds: [...],
    bankAccounts: [...],
    fixedDeposits: [...],
    investments: [...],
    totalNetWorth: 0
  },
  education: {
    current: {school/college name, class/year},
    records: [...] // marksheets with OCR text
  },
  documents: {
    identity: [...], // PAN, Aadhaar, Passport, DL
    insurance: [...],
    medical: [...],
    legal: [...]
  },
  storageMeta: {
    used: 0, // bytes
    limit: 524288000, // 500MB in bytes
    lastBackup: "timestamp",
    documentCount: 0
  }
}
```

---

## FEATURES & SECTIONS

### 1. MASTER DASHBOARD (Home)
- [ ] Family overview cards (6 member photos/names)
- [ ] Total family net worth calculation
- [ ] Recent activity timeline
- [ ] Storage usage indicator (total & per member)
- [ ] Last backup timestamp
- [ ] Quick stats: Total mutual funds, Total bank balance, etc.

### 2. MEMBER PROFILES (Individual Page per Person)
Each member has dedicated page with:
- [ ] Personal Info Section
  - Name, relation, DOB, contact details
  - Address history
  - Photo/avatar

- [ ] Financial Summary
  - Total invested, current value, gains/losses
  - Mutual fund breakdown
  - Bank account summary
  - Monthly cash flow

- [ ] Document Gallery
  - Categorized by type (identity, education, insurance, medical, legal)
  - Thumbnail preview
  - OCR text display
  - Document date & notes

- [ ] Education Timeline
  - Current school/college
  - Marksheets with OCR grades
  - Certificates
  - Academic progression

- [ ] Personal Timeline
  - Important dates
  - Life events
  - Medical records

### 3. FINANCIAL TRACKER
- [ ] Mutual Funds Manager
  - Add/edit/delete funds
  - NAV tracking
  - Units & purchase price
  - Real-time gain/loss calculation
  - Category breakdown

- [ ] Bank Accounts Manager
  - Account type (savings, current, salary, investment)
  - Bank name, branch, account number
  - Balance tracking
  - Monthly statement upload

- [ ] Investments & FDs
  - Fixed deposit details
  - Maturity tracking
  - Interest calculation
  - Investment certificates

### 4. DOCUMENT MANAGEMENT SYSTEM
- [ ] Upload Interface
  - Drag & drop upload
  - Multiple file format support (PDF, JPG, PNG)
  - Batch upload capability

- [ ] OCR Processing
  - Tesseract.js for text extraction (client-side)
  - Auto-detect document type
  - Editable OCR text
  - Language support (English, Hindi)

- [ ] Document Organization
  - Auto-categorize documents
  - Custom tags & folders
  - Document dating
  - Full-text search across all OCR text

- [ ] Storage Management
  - Real-time storage usage per member
  - Storage quota: 500MB per member
  - Visual progress bar
  - Warning at 80%, 90%, 100%
  - Compression options for PDFs

### 5. BACKUP & EXPORT SYSTEM
- [ ] Cloud Backup
  - Auto-backup to Firebase Storage (daily)
  - Backup timestamp tracking
  - Restore capability
  - Backup size indication

- [ ] Export Features
  - Export individual member PDF (name, age, contact, documents, financials)
  - Export family report PDF
  - Export specific category as PDF
  - CSV export for financial data
  - JSON backup of all data

- [ ] Data Restore
  - Restore from cloud backup
  - Restore specific member data
  - Version history (last 30 days)

### 6. SECURITY & ACCESS CONTROL
- [ ] Master Login (Siddharth only)
  - Email: seeksiddharth@gmail.com
  - Master password (minimum 6 characters)
  - Session management

- [ ] Read-Only Mode
  - Other 5 family members can view all data
  - Cannot edit/delete/upload
  - Cannot change settings
  - Cannot manage backups

- [ ] Permission Levels
  - Admin: Siddharth (full access)
  - Viewer: Everyone else (read-only)

### 7. SETTINGS & ADMINISTRATION
- [ ] Account Settings (Admin only)
  - Change master password
  - Manage backup schedule
  - Configure storage limits
  - Member management

- [ ] Backup Settings
  - Auto-backup frequency
  - Cloud provider selection
  - Backup retention period

- [ ] Data Management
  - Delete old documents
  - Archive completed records
  - Database maintenance

---

## TECHNICAL ARCHITECTURE

### Frontend
```
├── index.html (Master Dashboard)
├── members/
│   ├── member-profile.html (individual member page template)
│   └── member-list.html (all members view)
├── financial/
│   ├── mutual-funds.html
│   ├── bank-accounts.html
│   └── investments.html
├── documents/
│   ├── upload.html
│   ├── gallery.html
│   └── search.html
├── backup/
│   ├── backup-settings.html
│   └── restore.html
├── css/
│   ├── main.css
│   ├── responsive.css
│   └── theme.css
└── js/
    ├── app.js (main app logic)
    ├── auth.js (master login)
    ├── members.js (member management)
    ├── financial.js (finance tracking)
    ├── documents.js (document management)
    ├── ocr.js (Tesseract.js integration)
    ├── storage.js (localStorage & IndexedDB)
    ├── backup.js (Firebase integration)
    └── export.js (PDF & CSV generation)
```

### Data Storage Strategy
```
LOCAL STORAGE (Metadata & Small Data):
├── User login state
├── Current member selection
├── App settings
└── Member contact info

INDEXEDDB (Large Data):
├── All financial records
├── Document metadata & thumbnails
├── OCR text extractions
└── Backup history

CLOUD STORAGE (Firebase):
├── Full data backups (JSON)
├── Document files (PDF, images)
└── Backup versions (timestamp-based)
```

### Libraries & Tools
- **Tesseract.js** — OCR for document text extraction
- **Firebase** — Cloud backup & storage
- **jsPDF** — PDF generation for exports
- **html2canvas** — Convert HTML to images for PDF
- **FileSaver.js** — Download files from browser
- **Dropzone.js** — File upload interface

---

## IMPLEMENTATION ROADMAP

### Phase 1: Core Setup (Week 1)
- [ ] Master login system (Siddharth only)
- [ ] Family member management (6 people)
- [ ] Basic member profiles
- [ ] localStorage implementation
- [ ] UI framework & styling

### Phase 2: Financial Tracking (Week 2)
- [ ] Upgrade current MF tracker
- [ ] Bank account manager
- [ ] Investment tracker
- [ ] Net worth calculations
- [ ] Financial summaries per member

### Phase 3: Document System (Week 3)
- [ ] File upload interface
- [ ] Document categorization
- [ ] Storage quota management
- [ ] Document preview
- [ ] Delete/archive functionality

### Phase 4: OCR Integration (Week 4)
- [ ] Tesseract.js integration
- [ ] Auto text extraction
- [ ] Editable OCR results
- [ ] Full-text search
- [ ] Document indexing

### Phase 5: Cloud Backup (Week 5)
- [ ] Firebase setup
- [ ] Auto-backup system
- [ ] Restore functionality
- [ ] Backup versioning
- [ ] Data sync

### Phase 6: Export & Reporting (Week 6)
- [ ] PDF generation
- [ ] Family reports
- [ ] Individual member exports
- [ ] CSV export for finances
- [ ] Custom reports

### Phase 7: Polish & Optimization (Week 7)
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Dark mode
- [ ] Accessibility
- [ ] Testing & debugging

---

## STORAGE ALLOCATION

```
Per Member Storage: 500MB
├── Mutual Fund Documents: ~10MB (estimated)
├── Bank Statements: ~50MB (estimated)
├── School Marksheets: ~100MB (estimated)
├── Identity Documents: ~50MB (estimated)
├── Insurance Policies: ~30MB (estimated)
├── Medical Records: ~50MB (estimated)
├── Other Documents: ~200MB (estimated)
└── Reserved for OCR thumbnails: ~10MB

Total Family Storage: 6 members × 500MB = 3GB
Cloud Backup: Full data + documents = ~3-5GB
```

---

## SECURITY CONSIDERATIONS

✅ **Implemented:**
- Master password protection (Siddharth only)
- Read-only access for family members
- localStorage encryption (if needed)
- Data validation before storage

⚠️ **Future Enhancements:**
- Two-factor authentication
- Audit logs for all changes
- Data encryption at rest
- Role-based access control

---

## FILE STRUCTURE (aadyadvait.com)

```
aadyadvait/
├── index.html (master dashboard)
├── login.html (master login page)
├── dashboard/
│   ├── family-overview.html
│   └── activity-timeline.html
├── members/
│   ├── member-list.html
│   ├── member-profile.html
│   └── member-detail.html
├── financial/
│   ├── mf-tracker.html (existing - enhanced)
│   ├── bank-manager.html
│   └── investments.html
├── documents/
│   ├── upload.html
│   ├── gallery.html
│   ├── search.html
│   └── ocr-viewer.html
├── backup/
│   ├── settings.html
│   └── history.html
├── css/
│   ├── style.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── modules/
│   │   ├── auth.js
│   │   ├── members.js
│   │   ├── storage.js
│   │   ├── backup.js
│   │   └── ocr.js
│   └── vendor/
│       ├── tesseract.js
│       └── firebase.js
└── CNAME (aadyadvait.com)
```

---

## NEXT STEPS

1. ✅ **Approve this plan**
2. Start Phase 1: Master authentication system
3. Create master login page (seeksiddharth@gmail.com)
4. Set up member profiles for all 6 family members
5. Build master dashboard

**Estimated Total Time:** 6-8 weeks (working 4-5 hours/day)

**Ready to proceed with Phase 1?**
