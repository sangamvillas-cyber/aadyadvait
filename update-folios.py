#!/usr/bin/env python3
"""
update-folios.py — refresh holdings from a statement, auto-routing by folio.

Drop in a CAS PDF (MF Central / CAMS-KFintech) or a single-folio details
spreadsheet (e.g. ICICI / CAMS .xlsx) and this reads every folio out of it,
looks each one up in folio-registry.json (the SOURCE OF TRUTH for who owns
which folio), and updates that person's holdings in tracking-data.json.

You never place a holding under a person by hand — the registry's
folio -> owner map does it. Any folio the registry has not seen is REPORTED,
never guessed, so a minor's account can't be silently absorbed into a parent.

Cost basis uses the average-cost method: exact in-window average where the
folio opened at zero in the statement, otherwise blended with the existing
cost for units that predate the statement window.

Usage
-----
  python3 update-folios.py statement.pdf              # preview only (no writes)
  python3 update-folios.py statement.xlsx             # preview only
  python3 update-folios.py statement.pdf --apply      # write changes

With --apply it writes tracking-data.json, recomputes member totals, and runs
the folio guard (verify-folios.py). New/unknown folios are listed with the one
line you need to add to folio-registry.json before re-running.
"""
import datetime
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
TODAY = datetime.date.today()


# ─────────────────────────── helpers ───────────────────────────
def load(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as fh:
        return json.load(fh)


def fund_key(name):
    """Stable key to match the same fund across statements / our data."""
    n = name.lower()
    if "elss" in n or "tax saver" in n: return "elss"
    if "nifty" in n or ("index" in n and "nifty" in n): return "nifty"
    if "liquid" in n: return "liquid"
    if "large and midcap" in n or "large & midcap" in n or "emerging bluechip" in n: return "largemid"
    if "large cap" in n or "largecap" in n: return "largecap"
    if "mid" in n: return "mid"
    if "flexi" in n or "long term value" in n: return "flexi"
    if "small" in n: return "small"
    if "value" in n: return "value"
    return re.sub(r"[^a-z]", "", n)[:8]


def n2f(s):
    s = str(s).strip()
    neg = s.startswith("(") and s.endswith(")")
    s = s.strip("()").replace(",", "")
    try:
        v = float(s)
    except ValueError:
        return 0.0
    return -v if neg else v


# ─────────────────────────── parsers ───────────────────────────
def parse_cas_pdf(path):
    """Return list of positions from an MF Central / CAMS-KFintech detail CAS."""
    txt = subprocess.run(["pdftotext", "-layout", path, "-"],
                         capture_output=True, text=True).stdout
    lines = txt.split("\n")

    NUM = r"\(?-?[\d,]+\.\d+\)?"
    date_re = re.compile(r"^(\d{2}-[A-Z]{3}-\d{4})\s+(.*)")
    folio_re = re.compile(r"FOLIO NO:\s*([0-9/]+)")
    open_re = re.compile(r"Opening Unit Balance:\s*([\d,]+\.\d+)")
    close_re = re.compile(
        r"Closing Unit Balance:\s*([\d,]+\.\d+).*?Nav as on ([0-9A-Z-]+):\s*INR\s*([\d,]+\.\d+)")

    positions, cur, fundhouse, i = [], None, None, 0
    while i < len(lines):
        ln = lines[i]
        fh = re.match(r"^([A-Za-z][A-Za-z &]+? Mutual Fund)\s*$", ln.strip())
        if fh:
            fundhouse = fh.group(1).replace(" Mutual Fund", "")
        fm = folio_re.search(ln)
        if fm:
            folio = fm.group(1)
            j, namebuf = i, ln
            if "ISIN" not in ln:
                j = i + 1
                namebuf = lines[j]
            name = re.split(r"\(Advisor|\bISIN:", namebuf)[0]
            name = re.sub(r"\(formerly.*?\)", "", name).strip()
            om = open_re.search(namebuf)
            cur = dict(fundHouse=fundhouse, folio=folio, fund=name,
                       opening=n2f(om.group(1)) if om else 0.0,
                       in_amt=0.0, in_units=0.0, navDate=None,
                       units=None, currentNav=None)
            positions.append(cur)
            i = j + 1
            continue
        if cur is not None:
            dm = date_re.match(ln.strip())
            if dm:
                nums = re.findall(NUM, ln)
                if len(nums) >= 4:
                    amount, units = n2f(nums[-4]), n2f(nums[-3])
                    if units > 0 and amount > 0:
                        cur["in_amt"] += amount
                        cur["in_units"] += units
            cm = close_re.search(ln)
            if cm:
                cur["units"] = n2f(cm.group(1))
                cur["currentNav"] = n2f(cm.group(3))
                d = cm.group(2)            # e.g. 24-JUN-2026
                try:
                    cur["navDate"] = datetime.datetime.strptime(d, "%d-%b-%Y").date().isoformat()
                except ValueError:
                    cur["navDate"] = None
                cur = None
        i += 1
    return [p for p in positions if p["units"] is not None]


def parse_folio_xlsx(path):
    """Return positions from a single-folio details sheet (ICICI/CAMS style)."""
    try:
        import openpyxl
    except ImportError:
        sys.exit("openpyxl needed for .xlsx — run: pip3 install openpyxl")
    wb = openpyxl.load_workbook(path, data_only=True)
    positions = []
    for ws in wb.worksheets:
        kv, folio = {}, None
        for row in ws.iter_rows(values_only=True):
            cells = [c for c in row if c is not None and str(c).strip()]
            if len(cells) >= 2:
                kv.setdefault(str(cells[0]).strip().rstrip(":"), cells[1])
            if cells and str(cells[0]).strip().rstrip(":") == "Folio":
                folio = str(cells[1]).strip()
        if not folio:
            continue
        scheme = str(kv.get("Scheme", "")).strip()
        amc = ws.title  # often the PAN; fund house refined below
        positions.append(dict(
            folio=folio,
            fund=scheme,
            fundHouse=("ICICI Prudential" if "nifty" in scheme.lower() and "icici" not in scheme.lower() else amc),
            units=n2f(kv.get("Balance Units", 0)),
            currentNav=n2f(kv.get("Current NAV", 0)),
            avgCost=n2f(kv.get("Avg. Purchase NAV", 0)) or None,
            navDate=None, opening=0.0, in_amt=0.0, in_units=0.0,
        ))
    return positions


# ─────────────────────────── apply ───────────────────────────
def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    apply = "--apply" in sys.argv
    if not args:
        sys.exit(__doc__)
    path = args[0]
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        positions = parse_cas_pdf(path)
    elif ext in (".xlsx", ".xls"):
        positions = parse_folio_xlsx(path)
    else:
        sys.exit(f"Unsupported file type: {ext} (use .pdf or .xlsx)")

    data = load("tracking-data.json")
    reg = load("folio-registry.json")
    owner_of = reg["folios"]

    # index existing holdings
    existing = {}
    for mid, block in data.items():
        if mid == "trackingMetadata" or not isinstance(block, dict):
            continue
        for t in block.get("transactions", []):
            existing[(str(t["folio"]), fund_key(t["fund"]))] = (mid, t)

    changed_members, updates, adds, unknown = set(), [], [], []
    for p in positions:
        folio, k = str(p["folio"]), fund_key(p["fund"])
        owner = owner_of.get(folio)
        if owner is None:
            unknown.append(p)
            continue
        # Average cost — only from the statement when fully derivable, so the
        # tool is idempotent (re-running never drifts the cost basis):
        #   • xlsx gives the folio's avg buy NAV outright → use it
        #   • CAS folio that opened at zero in-window → in-window average is complete
        #   • CAS folio with units predating the window → keep existing cost (None)
        if p.get("avgCost"):
            cost = p["avgCost"]
        elif p["opening"] <= 1 and p["in_units"]:
            cost = p["in_amt"] / p["in_units"]
        else:
            cost = None
        match = existing.get((folio, k))
        if match:
            mid, t = match
            new_cost = round(cost, 4) if cost is not None else t["purchaseNav"]
            updates.append((mid, t["fund"], t["units"], p["units"], t["purchaseNav"], new_cost))
            t["units"] = round(p["units"], 3)
            t["purchaseNav"] = new_cost
            t["currentNav"] = round(p["currentNav"], 4)
            t["lastNavUpdate"] = p["navDate"] or t.get("lastNavUpdate")
            changed_members.add(mid)
        else:
            cost = cost or p["currentNav"]
            nt = dict(id=f"{owner}_{k}_{folio}", fund=p["fund"], fundHouse=p["fundHouse"],
                      folio=folio, type="holding", units=round(p["units"], 3),
                      purchaseDate=(p.get("navDate") or TODAY.isoformat()),
                      purchaseNav=round(cost, 4), currentNav=round(p["currentNav"], 4),
                      lastNavUpdate=p["navDate"] or TODAY.isoformat())
            adds.append((owner, nt))
            changed_members.add(owner)

    # ── report ──
    print(f"Statement: {os.path.basename(path)}  →  {len(positions)} position(s) read\n")
    if updates:
        print(f"  {len(updates)} holding(s) to UPDATE:")
        for mid, fund, ou, nu, op, np_ in updates:
            print(f"     {mid:9} {fund[:38]:38} units {ou:>11,.2f}→{nu:>11,.2f}  cost {op:>7.1f}→{np_:>7.1f}")
    if adds:
        print(f"\n  {len(adds)} NEW holding(s) to ADD:")
        for owner, nt in adds:
            print(f"     {owner:9} {nt['fund'][:42]:42} {nt['units']:,.2f} units @ ₹{nt['currentNav']}")
    if unknown:
        print(f"\n  ⚠ {len(unknown)} UNKNOWN folio(s) — add to folio-registry.json first:")
        for p in unknown:
            print(f'     folio {p["folio"]:14} {p["fund"][:40]}')
            print(f'        → in "folios" add:  "{p["folio"]}": "<owner-id>"')
            print(f'          if a minor, also add the guardian in "folioGuardians".')
    if not (updates or adds):
        print("  Nothing to change — data already matches this statement.")

    if not apply:
        print("\n(preview only — re-run with --apply to write)")
        return

    # ── write ──
    for owner, nt in adds:
        data[owner]["transactions"] = [t for t in data[owner]["transactions"]
                                       if str(t.get("folio")) != nt["folio"] or fund_key(t["fund"]) != fund_key(nt["fund"])]
        data[owner]["transactions"].append(nt)

    ref = TODAY
    for mid in changed_members:
        v = data[mid]
        inv = sum(t["units"] * t["purchaseNav"] for t in v["transactions"])
        cur = sum(t["units"] * t["currentNav"] for t in v["transactions"])
        g = cur - inv
        v["totalInvested"] = round(inv, 2)
        v["totalCurrentValue"] = round(cur, 2)
        v["totalGain"] = round(g, 2)
        v["totalGainPercent"] = round(g / inv * 100, 2) if inv else 0
        num = den = 0
        for t in v["transactions"]:
            pv, cv = t["units"] * t["purchaseNav"], t["units"] * t["currentNav"]
            yrs = (ref - datetime.date.fromisoformat(t["purchaseDate"])).days / 365.25
            x = ((cv / pv) ** (1 / yrs) - 1) * 100 if yrs > 0 and pv > 0 else 0
            num += cv * x
            den += cv
        v["overallXIRR"] = round(num / den, 2) if den else 0

    data.setdefault("trackingMetadata", {})["lastUpdated"] = TODAY.isoformat() + "T00:00:00Z"
    with open(os.path.join(ROOT, "tracking-data.json"), "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
    print(f"\n✅ Wrote tracking-data.json · updated {sorted(changed_members)}")

    print("\nRunning folio guard…\n")
    subprocess.run([sys.executable, os.path.join(ROOT, "verify-folios.py")])


if __name__ == "__main__":
    main()
