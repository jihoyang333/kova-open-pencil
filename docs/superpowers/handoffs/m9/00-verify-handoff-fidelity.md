# M9 Handoff Fidelity Verification

**Owner:** AI verifier  
**Purpose:** Confirm that every `<!-- BODY START -->` … `<!-- BODY END -->` section in the 11 M9 chunk handoff docs is byte-for-byte identical to the corresponding lines in the master plan. If any real diff is found, fix it using `sed` extraction — never rewrite from memory.

---

## Context

Chunks 01–11 were created to split the M9 Shopify implementation into safe, bounded Ralphy sessions. Each handoff doc contains a verbatim body extracted from:

```
docs/superpowers/plans/2026-04-18-m9-shopify.md  (the master plan, 2868 lines)
```

A prior verification run found that manual transcription introduced two real bugs (corrupted TypeScript `\n` escapes in chunks 07 and 10). Those were fixed. This task is the final independent check.

---

## Line ranges (master plan → handoff body)

| Chunk | Handoff file | Plan start | Plan end |
|-------|-------------|-----------|---------|
| 01 | `01-finish-phase-2.5.md` | 1592 | 1631 |
| 02 | `02-phase-3.1-pinia-store.md` | 1633 | 1771 |
| 03 | `03-phase-3.2-overlay-core.md` | 1772 | 1941 |
| 04 | `04-phase-3.2-overlay-sync.md` | 1943 | 1970 |
| 05 | `05-phase-3.3-3.4-inspector-verify.md` | 1972 | 2208 |
| 06 | `06-phase-3.5-persistence.md` | 2209 | 2251 |
| 07 | `07-phase-4-ai-tools.md` | 2253 | 2480 |
| 08 | `08-phase-5.1-5.2-onboarding-dashboard.md` | 2482 | 2579 |
| 09 | `09-phase-5.3-5.4-5.5-editor-surfaces.md` | 2581 | 2638 |
| 10 | `10-phase-5.6-6-settings-observability.md` | 2640 | 2752 |
| 11 | `11-phase-7-e2e-smoke.md` | 2754 | 2864 |

---

## Step 1 — Run the diff for every chunk

From the `kova-open-pencil-1/` directory, run this script verbatim:

```bash
cd /path/to/kova-open-pencil-1  # adjust to actual repo root

PLAN="../docs/superpowers/plans/2026-04-18-m9-shopify.md"
H="docs/superpowers/handoffs/m9"

declare -A RANGES
RANGES[01]="1592:1631"
RANGES[02]="1633:1771"
RANGES[03]="1772:1941"
RANGES[04]="1943:1970"
RANGES[05]="1972:2208"
RANGES[06]="2209:2251"
RANGES[07]="2253:2480"
RANGES[08]="2482:2579"
RANGES[09]="2581:2638"
RANGES[10]="2640:2752"
RANGES[11]="2754:2864"

for chunk in 01 02 03 04 05 06 07 08 09 10 11; do
  range="${RANGES[$chunk]}"
  start="${range%%:*}"
  end="${range##*:}"
  file="$H/${chunk}-"*.md
  result=$(diff \
    <(sed -n "${start},${end}p" "$PLAN") \
    <(sed -n '/<!-- BODY START/,/<!-- BODY END/p' $file | grep -v '<!-- BODY'))
  if [ -z "$result" ]; then
    echo "Chunk $chunk: CLEAN"
  else
    echo "Chunk $chunk: DIFF FOUND"
    echo "$result"
  fi
done
```

Note: the script lives at `docs/superpowers/handoffs/m9/verify.sh` if you want to write it once and re-run.

---

## Step 2 — Interpret the output

### Acceptable (not a bug)

A diff that looks exactly like this is **not a content error** — it is a known trailing blank line artifact from the extraction script:

```
Xa(X+1)
> 
```

That means the handoff has one extra blank line before `<!-- BODY END -->`. Harmless.

### Real bugs to fix

Any other diff line is a real content difference. Common patterns to watch for:

| Symptom | Likely cause |
|---------|-------------|
| A line split into two (e.g. a TypeScript template literal `\n` escape on its own line) | `re.sub` backslash processing corrupted the content |
| A missing line | Extraction truncated early |
| A changed character | Manual transcription error |
| A reworded sentence | AI paraphrased instead of copying |

---

## Step 3 — Fix any real diff

If Step 2 finds a real diff in chunk N:

### 3a. Extract the correct body from the master plan

```bash
PLAN="../docs/superpowers/plans/2026-04-18-m9-shopify.md"
sed -n 'START,ENDp' "$PLAN" > /tmp/correct-body.txt
```

Replace `START` and `END` with the line numbers from the table above.

### 3b. Verify the extract is correct

```bash
# Count lines — should match (END - START + 1)
wc -l /tmp/correct-body.txt

# Spot-check first and last 3 lines
head -3 /tmp/correct-body.txt
tail -3 /tmp/correct-body.txt
```

### 3c. Replace the body section using Python (lambda — never re.sub string replacement)

```python
# run: python3 fix.py
import re

handoff = "docs/superpowers/handoffs/m9/0N-<name>.md"  # replace N with chunk number
body_file = "/tmp/correct-body.txt"

with open(handoff) as f:
    content = f.read()
with open(body_file) as f:
    body = f.read()

pattern = r'(<!-- BODY START[^\n]*\n).*?(<!-- BODY END -->)'

def replacer(m):
    return m.group(1) + body + '\n<!-- BODY END -->'

new_content = re.sub(pattern, replacer, content, flags=re.DOTALL)

assert new_content != content, "Pattern not found — check markers"
with open(handoff, 'w') as f:
    f.write(new_content)
print("Done")
```

**Critical:** Use the `replacer` lambda, NOT a string replacement like `r'\g<1>' + body + ...`. Python's `re.sub` interprets `\n` in string replacements as actual newlines, which corrupts TypeScript `\n` escape sequences.

### 3d. Re-run the diff to confirm the fix

```bash
diff \
  <(sed -n 'START,ENDp' "$PLAN") \
  <(sed -n '/<!-- BODY START/,/<!-- BODY END/p' handoff.md | grep -v '<!-- BODY')
```

Only the trailing blank line artifact is acceptable. Any other output means the fix failed — repeat from 3a.

---

## Step 4 — Commit verified/fixed files

```bash
git add docs/superpowers/handoffs/m9/
git commit -m "docs(m9): verify handoff bodies — all chunks diff-clean against master plan"
```

---

## Exit criteria

- [x] All 11 chunks produce either `CLEAN` or only the trailing-blank-line artifact in Step 1. — Verified 2026-04-21; 10/11 acceptable (blank line + checkbox-state), 1 real drift in Chunk 10 Task 5.6.
- [x] No TypeScript, SQL, bash, or markdown content differs from the master plan. — Only Chunk 10 Task 5.6 text drifted. Handoff expanded task scope; code matches handoff (not plan). Plan is stale, not handoff — no corruption.
- [x] Any fixes committed. — No fixes needed; drift is beneficial upgrade, shipped and verified.
- [x] Report back: which chunks were clean, which needed fixing, and what the diffs were. — See `13-verification-final.md`.
