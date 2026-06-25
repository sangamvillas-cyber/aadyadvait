#!/usr/bin/env python3
"""
Folio guard — keeps minor and guardian holdings from getting mixed up.

Run this after EVERY edit or upload to tracking-data.json:

    python3 verify-folios.py

It checks tracking-data.json against folio-registry.json (the source of
truth for who owns each folio) and refuses to stay quiet if anything looks
off. Three things it catches:

  1. MISMATCH  — a folio mapped to the wrong person (e.g. a minor's folio
                 that slipped under the guardian). This is the dangerous one.
  2. UNKNOWN   — a folio in the data that the registry has never seen. New
                 folios must be classified by hand so a minor account is
                 never auto-absorbed into a parent's.
  3. MISSING   — a registry folio that has vanished from the data (sold out,
                 or an upload dropped it). Informational.

Exit code is non-zero if any MISMATCH or UNKNOWN is found, so it can gate
a commit hook later if you want.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


def load(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as fh:
        return json.load(fh)


def main():
    reg = load("folio-registry.json")
    data = load("tracking-data.json")

    people = reg["people"]
    owner_of = reg["folios"]
    guardian_of = reg.get("folioGuardians", {})

    def guardian_for(folio):
        """Operating guardian for a minor folio: per-folio override, else the
        owner's default guardian. Empty for adult folios."""
        if folio in guardian_of:
            return guardian_of[folio]
        owner = owner_of.get(folio)
        return people.get(owner, {}).get("guardian", "")

    # Build folio -> owner as it appears in the live data.
    data_folios = {}      # folio -> set(member ids it appears under)
    for mid, block in data.items():
        if mid == "trackingMetadata" or not isinstance(block, dict):
            continue
        for t in block.get("transactions", []):
            f = str(t.get("folio", "")).strip()
            if not f:
                continue
            data_folios.setdefault(f, set()).add(mid)

    mismatches, unknowns = [], []

    for folio, members in sorted(data_folios.items()):
        # A single folio should sit under exactly one member.
        if len(members) > 1:
            mismatches.append(
                f"folio {folio} appears under MULTIPLE people: {sorted(members)}"
            )
            continue
        actual = next(iter(members))
        expected = owner_of.get(folio)
        if expected is None:
            unknowns.append((folio, actual))
        elif expected != actual:
            exp_p, act_p = people.get(expected, {}), people.get(actual, {})
            note = ""
            # The specific danger: a minor's folio landing under the guardian.
            if exp_p.get("type") == "minor" and exp_p.get("guardian") == actual:
                note = "  ← MINOR folio absorbed into GUARDIAN"
            elif act_p.get("type") == "minor" and act_p.get("guardian") == expected:
                note = "  ← GUARDIAN folio mis-filed under a MINOR"
            mismatches.append(
                f"folio {folio}: data says '{actual}', "
                f"registry says '{expected}'{note}"
            )

    missing = sorted(set(owner_of) - set(data_folios))

    # Guardian sanity: every minor folio must name a guardian who is a known adult.
    guardian_problems = []
    for folio, owner in owner_of.items():
        if people.get(owner, {}).get("type") != "minor":
            continue
        g = guardian_for(folio)
        if not g:
            guardian_problems.append(f"folio {folio} ({owner}) has no guardian set")
        elif people.get(g, {}).get("type") != "adult":
            guardian_problems.append(
                f"folio {folio} ({owner}) names guardian '{g}', who is not a known adult"
            )

    # ---- report ----
    print("Folio guard — minor / guardian separation check")
    print("=" * 60)

    if mismatches:
        print(f"\n  ❌ {len(mismatches)} MISMATCH(es) — fix before trusting the data:")
        for m in mismatches:
            print(f"     • {m}")

    if unknowns:
        print(f"\n  ⚠  {len(unknowns)} UNKNOWN folio(s) — classify in folio-registry.json:")
        for f, who in unknowns:
            print(f'     • folio {f} (currently under "{who}") — add it to "folios"')

    if missing:
        print(f"\n  ·  {len(missing)} registry folio(s) not in current data (sold/dropped):")
        for f in missing:
            print(f'     • folio {f} (owner "{owner_of[f]}")')

    if guardian_problems:
        print(f"\n  ❌ {len(guardian_problems)} guardian problem(s):")
        for g in guardian_problems:
            print(f"     • {g}")

    # Minor / guardian separation summary — the reassuring part.
    print("\n  Minor accounts (held in the child's own name, operated by a guardian):")
    for mid, p in people.items():
        if p.get("type") != "minor":
            continue
        owned = sorted(f for f, o in owner_of.items() if o == mid and f in data_folios)
        # group this minor's folios by their operating guardian
        by_g = {}
        for f in owned:
            by_g.setdefault(guardian_for(f), []).append(f)
        print(f"     • {p['name']} — {len(owned)} folio(s):")
        for g, fs in sorted(by_g.items()):
            gname = people.get(g, {}).get("name", g or "—")
            print(f"         guardian {gname:18} {len(fs)} folio(s): {', '.join(fs)}")

    ok = not mismatches and not unknowns and not guardian_problems
    print("\n" + "=" * 60)
    print("  ✅ All folios correctly separated by name." if ok
          else "  ❌ Action needed — see above.")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
