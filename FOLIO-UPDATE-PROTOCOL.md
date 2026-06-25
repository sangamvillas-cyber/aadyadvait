# Folio update protocol

How to refresh the portfolio when a new statement arrives. Every folio is
**auto-routed to the right family member** — you never place a holding by hand.

## The one rule

`folio-registry.json` is the **source of truth** for who owns each folio and,
for minors, who the guardian is. The update tool reads folios out of a
statement and routes each one to its owner using this file. A folio the
registry has never seen is **reported, never guessed** — so a child's account
can't be silently merged into a parent's.

## Files

| File | Role |
|------|------|
| `folio-registry.json` | folio → owner, and minor-folio → guardian (you edit this) |
| `tracking-data.json`  | the holdings the dashboard reads (the tool writes this) |
| `update-folios.py`    | reads a statement, routes by folio, updates holdings |
| `verify-folios.py`    | the guard — checks minors stay separate from guardians |

## Steps

1. **Save the statement** anywhere (e.g. `~/Downloads`). Supported:
   - MF Central / CAMS-KFintech **detailed CAS** → `.pdf`
   - ICICI / CAMS **single-folio details** → `.xlsx`

2. **Preview** (writes nothing):
   ```
   cd ~/aadyadvait
   python3 update-folios.py ~/Downloads/<statement>
   ```
   It prints every holding it will update or add, and flags any **unknown folio**.

3. **If it flags an unknown folio**, add it to `folio-registry.json` first:
   - under `"folios"`:  `"<folio>": "<owner-id>"`  (owner-id = `siddharth`, `archana`, `aadya`, `advait`, `sheoshyam`)
   - if the owner is a **minor** (`aadya`/`advait`), also add the operating
     guardian under `"folioGuardians"`:  `"<folio>": "<guardian-id>"`
   - then re-run the preview.

4. **Apply**:
   ```
   python3 update-folios.py ~/Downloads/<statement> --apply
   ```
   This writes `tracking-data.json`, recomputes each member's totals, and runs
   the folio guard automatically. You want to see `✅ All folios correctly
   separated by name.`

5. **Refresh the dashboard** (http://localhost:8000) — the Portfolio tab now
   shows the new figures.

## What the tool does to each number

- **Units & current NAV** — taken straight from the statement (exact).
- **Cost basis (avg buy NAV)** — idempotent, so re-running never drifts it:
  - `.xlsx` gives the folio's average buy NAV → used directly.
  - CAS folio that started at zero within the statement window → the in-window
    average is the full cost → used.
  - CAS folio holding units from **before** the statement window → the existing
    cost is **kept** (the statement can't show pre-window cost).
- **Totals & XIRR** — recomputed for every member that changed.

## Notes

- A CAS is consolidated by PAN, so one statement can carry both a person's own
  folios **and** the minor folios they're guardian for. The registry sorts them
  out — the holdings still land under the **minor**, with the guardian recorded
  separately.
- One person's folio and another's folio in the **same fund** are kept distinct
  by folio number (e.g. Siddharth's ICICI Nifty 50 `9238588` vs Advait's
  `14453239`).
- A brand-new fund the dashboard doesn't recognise won't get a market-cap tag
  until its name is added to `CAT_MAP` in `dashboard.html`. The tool prints new
  funds so you know when that's needed.
- Run `python3 verify-folios.py` any time to re-check the minor/guardian split.
