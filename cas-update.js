#!/usr/bin/env node
/**
 * cas-update.js  —  Parse a CAMS CAS PDF and update tracking-data.json
 *
 * Usage:
 *   node cas-update.js <cas.pdf> [pdf-password] [--dry-run]
 *
 * Requires:
 *   npm install pdf-parse          (text extraction)
 *   brew install qpdf              (optional — only for password-protected PDFs)
 *
 * What it does:
 *   1. Extracts text from the CAS PDF (decrypts first if password given)
 *   2. Parses every fund block: folio + fund name + closing units + NAV + date
 *   3. Matches each parsed holding to tracking-data.json by folio + fuzzy fund name
 *   4. Shows a clear diff of what will change
 *   5. Writes tracking-data.json (unless --dry-run)
 */

'use strict';
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { execSync, spawnSync } = require('child_process');

const TRACKING_FILE = path.resolve(__dirname, 'tracking-data.json');

// ─── CLI args ────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const pdfPath = args.find(a => a.endsWith('.pdf'));
const password= args.find(a => !a.startsWith('--') && !a.endsWith('.pdf'));

if (!pdfPath) {
  console.error('Usage: node cas-update.js <cas.pdf> [password] [--dry-run]');
  process.exit(1);
}
if (!fs.existsSync(pdfPath)) {
  console.error('File not found:', pdfPath);
  process.exit(1);
}

// ─── PDF text extraction ─────────────────────────────────────────────────────
async function extractText(filePath, pwd) {
  // If password provided, try qpdf first to get a clean decrypted copy
  let workPath = filePath;
  if (pwd) {
    const tmp = path.join(os.tmpdir(), 'cas_decrypted.pdf');
    const res = spawnSync('qpdf', ['--password=' + pwd, '--decrypt', filePath, tmp]);
    if (res.status === 0) {
      workPath = tmp;
      console.log('✓ Decrypted with qpdf');
    } else {
      console.log('qpdf not found or wrong password — trying pdf-parse directly');
    }
  }

  let pdfParse;
  try { pdfParse = require('pdf-parse'); }
  catch {
    console.error('pdf-parse not installed. Run: npm install pdf-parse');
    process.exit(1);
  }
  const buf  = fs.readFileSync(workPath);
  const opts = pwd ? { password: pwd } : {};
  const data = await pdfParse(buf, opts);
  return data.text;
}

// ─── CAS parser ──────────────────────────────────────────────────────────────
function parseCas(text) {
  const holdings = [];

  // Split into folio blocks on "FOLIO NO:" (MFCentral CAS format)
  const blocks = text.split(/(?=FOLIO\s+NO\s*[:\.])/i);

  for (const block of blocks) {
    // Extract folio number — "FOLIO NO: 10354395"
    const folioMatch = block.match(/FOLIO\s+NO\s*[:.]\s*([\w\/\-]+)/i);
    if (!folioMatch) continue;
    const folio = folioMatch[1].replace(/\s*\/\s*\d+$/, '').trim();

    // Closing units — same line as Nav: "Closing Unit Balance: 38,100.935Nav as on..."
    const unitsMatch = block.match(/Closing\s+Unit\s+Balance\s*[:\s]+([\d,]+\.?\d*)/i);
    if (!unitsMatch) continue;
    const units = parseFloat(unitsMatch[1].replace(/,/g, ''));

    // NAV and date — "Nav as on 08-MAY-2026: INR 91.5245" or "NAV on 11-May-2026: Rs.91.5245"
    const navMatch = block.match(/Nav\s+as\s+on\s+([\d]{1,2}[- ][A-Za-z]+[- ][\d]{4})\s*[:\s]+(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i);
    if (!navMatch) continue;
    const navDate = normaliseDate(navMatch[1]);
    const nav     = parseFloat(navMatch[2].replace(/,/g, ''));

    // Fund name — line immediately after FOLIO NO line; strip "(Advisor:...) ISIN:..." suffix
    const fundName = extractFundName(block);
    if (!fundName) continue;

    holdings.push({ folio, fundName, units, nav, navDate });
  }

  return holdings;
}

function extractFundName(block) {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  const skipPattern = /^FOLIO|^PAN:|^KYC|Registrar|NOMINEE|^-+|Opening|Closing|^Nav\s+as|Valuation|Purchase|Redemption|Dividend|Switch|SIP|IDCW|\bRs\b/i;
  for (const line of lines) {
    if (skipPattern.test(line)) continue;
    // Lines starting with digits are transaction rows
    if (/^\d{2}-[A-Z]{3}-\d{4}/.test(line)) continue;
    if (line.length < 8) continue;
    // Strip "(Advisor:...) ISIN:..." suffix that MFCentral appends to fund names
    const name = line.replace(/\s*\(Advisor:.*$/i, '').replace(/\s*ISIN:.*$/i, '').trim();
    if (name.length >= 8) return name;
  }
  return null;
}

function normaliseDate(raw) {
  // Convert "11-May-2026" or "11 May 2026" → "2026-05-11"
  const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
  const m = raw.match(/(\d{1,2})[- ]([A-Za-z]+)[- ](\d{4})/);
  if (!m) return raw;
  const mm = String(months[m[2].toLowerCase().slice(0,3)] || 1).padStart(2,'0');
  return `${m[3]}-${mm}-${m[1].padStart(2,'0')}`;
}

// ─── Fuzzy fund name matching ─────────────────────────────────────────────────
function normaliseName(n) {
  return n.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\b(fund|direct|plan|growth|option|regular)\b/g, '')
    .trim();
}

function nameScore(a, b) {
  const na = normaliseName(a), nb = normaliseName(b);
  if (na === nb) return 1;
  // Word overlap
  const wa = new Set(na.split(' ')), wb = new Set(nb.split(' '));
  const inter = [...wa].filter(w => wb.has(w) && w.length > 2).length;
  return inter / Math.max(wa.size, wb.size);
}

// ─── Match parsed holdings → tracking-data.json ───────────────────────────────
function matchAndUpdate(holdings, tracking) {
  const results = [];

  // Flatten all transactions with member reference
  const allTxns = [];
  for (const [memberId, memberData] of Object.entries(tracking)) {
    if (!memberData.transactions) continue;
    for (const txn of memberData.transactions) {
      allTxns.push({ memberId, txn });
    }
  }

  for (const h of holdings) {
    // Step 1: filter by folio (exact match on base folio)
    const folioMatches = allTxns.filter(({ txn }) => {
      const base = txn.folio.replace(/\s*\/\s*\d+$/, '').trim();
      return base === h.folio || txn.folio === h.folio;
    });

    if (folioMatches.length === 0) {
      results.push({ status: 'UNMATCHED', parsed: h });
      continue;
    }

    // Step 2: within folio matches, pick best fund name match
    const scored = folioMatches.map(m => ({ ...m, score: nameScore(h.fundName, m.txn.fund) }))
      .sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (best.score < 0.25) {
      results.push({ status: 'LOW_CONFIDENCE', parsed: h, matched: best, score: best.score });
      continue;
    }

    const oldUnits = best.txn.units;
    const oldNav   = best.txn.currentNav;
    const oldDate  = best.txn.lastNavUpdate;

    const changed = Math.abs(oldUnits - h.units) > 0.001 || Math.abs(oldNav - h.nav) > 0.001;

    results.push({
      status: changed ? 'UPDATED' : 'UNCHANGED',
      memberId: best.memberId,
      txn: best.txn,
      parsed: h,
      old: { units: oldUnits, nav: oldNav, navDate: oldDate },
      score: best.score,
    });

    if (changed && !DRY_RUN) {
      best.txn.units        = h.units;
      best.txn.currentNav   = h.nav;
      best.txn.lastNavUpdate= h.navDate;
    }
  }

  return results;
}

// ─── Pretty output ────────────────────────────────────────────────────────────
function fmt(n) { return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function printResults(results) {
  const updated   = results.filter(r => r.status === 'UPDATED');
  const unchanged = results.filter(r => r.status === 'UNCHANGED');
  const unmatched = results.filter(r => r.status === 'UNMATCHED');
  const lowConf   = results.filter(r => r.status === 'LOW_CONFIDENCE');

  console.log('\n' + '═'.repeat(70));
  console.log('  CAS UPDATE SUMMARY' + (DRY_RUN ? '  [DRY RUN — nothing written]' : ''));
  console.log('═'.repeat(70));

  if (updated.length) {
    console.log(`\n✅  ${updated.length} holding(s) updated:\n`);
    for (const r of updated) {
      console.log(`  [${r.memberId}] ${r.txn.fund}`);
      console.log(`    Folio   : ${r.txn.folio}`);
      console.log(`    Units   : ${r.old.units} → ${r.parsed.units}`);
      console.log(`    NAV     : ${r.old.nav} → ${r.parsed.nav}  (${r.parsed.navDate})`);
      console.log(`    Value   : ${fmt(r.old.units * r.old.nav)} → ${fmt(r.parsed.units * r.parsed.nav)}`);
      console.log();
    }
  }

  if (unchanged.length) {
    console.log(`⏸   ${unchanged.length} holding(s) unchanged (units & NAV match)`);
  }

  if (lowConf.length) {
    console.log(`\n⚠️   ${lowConf.length} low-confidence match(es) — skipped:\n`);
    for (const r of lowConf) {
      console.log(`  CAS fund  : "${r.parsed.fundName}"  (folio ${r.parsed.folio})`);
      console.log(`  Best match: "${r.matched.txn.fund}"  (score ${(r.matched.score*100).toFixed(0)}%)`);
      console.log();
    }
  }

  if (unmatched.length) {
    console.log(`\n❌  ${unmatched.length} holding(s) NOT found in tracking-data.json:\n`);
    for (const r of unmatched) {
      console.log(`  "${r.parsed.fundName}"  folio=${r.parsed.folio}  units=${r.parsed.units}`);
    }
    console.log('\n  → Add these manually to tracking-data.json if needed.');
  }

  console.log('\n' + '─'.repeat(70));
}

// ─── Update totalCurrentValue per member ──────────────────────────────────────
function recomputeTotals(tracking) {
  for (const [, memberData] of Object.entries(tracking)) {
    if (!memberData.transactions) continue;
    memberData.totalCurrentValue = memberData.transactions.reduce(
      (sum, t) => sum + t.units * t.currentNav, 0
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\nReading: ${pdfPath}`);
  const text = await extractText(pdfPath, password);

  console.log('Parsing CAS...');
  const holdings = parseCas(text);
  console.log(`Found ${holdings.length} fund holding(s) in CAS`);

  if (holdings.length === 0) {
    console.error('\nNo holdings parsed. The PDF format may not be supported.');
    console.error('Try extracting text manually and piping to this script.');
    process.exit(1);
  }

  const tracking = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
  const results  = matchAndUpdate(holdings, tracking);

  printResults(results);

  const updatedCount = results.filter(r => r.status === 'UPDATED').length;

  if (!DRY_RUN && updatedCount > 0) {
    recomputeTotals(tracking);
    tracking.trackingMetadata = tracking.trackingMetadata || {};
    tracking.trackingMetadata.lastCasImport = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(TRACKING_FILE, JSON.stringify(tracking, null, 2));
    console.log(`\n✓ tracking-data.json updated (${updatedCount} change(s))`);
    console.log('  → Run: git add tracking-data.json && git commit -m "Update NAV from CAS" && git push');
  } else if (!DRY_RUN && updatedCount === 0) {
    console.log('\n  Nothing to write — all holdings already up to date.');
  }
})();
