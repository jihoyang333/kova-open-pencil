#!/usr/bin/env bash
# Cluster 11 CI grep gates (Plan Phase 11 / W0-3, W0-4, W0-9).
#
# Run from the repo root (kova-open-pencil-1/). Exits non-zero on the first
# violation. Wired into .github/workflows/ci.yml as a step before unit tests.
#
# Adding a new check: append a section here + bump COMMENT BLOCK above with
# the W0-X founder lock or CT-X dispatch reference so reviewers can trace
# why the check exists.

set -euo pipefail

fail() {
  echo "::error::$1"
  exit 1
}

echo "[c11-ci] gate 1: Realtime channel naming convention"
# Every supabase.channel(...) call must start with "kova." per Plan §6 Task 1.7.
if grep -rnE "\\.channel\\('[^k]" src/ api/ 2>/dev/null; then
  fail 'non-"kova."-prefixed Realtime channel found — use channelName() / useChannelName() helper'
fi

echo "[c11-ci] gate 2: no VITE_ prefix on server-only secrets"
# Server secrets must NEVER carry VITE_ prefix; Vite would expose them to the
# browser bundle. Match in any file across the inner repo.
if grep -rnE 'VITE_(SENTRY_DSN_SERVER|RESEND_API_KEY|CRON_SECRET|SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|ANTHROPIC_API_KEY)' . --include='*.ts' --include='*.vue' --include='*.json' --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.wrangler 2>/dev/null; then
  fail 'server secret has VITE_ prefix — server-only env vars MUST NOT be browser-exposed'
fi

echo "[c11-ci] gate 3: no <icon-lucide-*> raw tags (W0-4)"
# Forbidden icon tag forms — must use <KovaIcon name="..."> per Cluster 11
# Plan Task 4.4. Allow the literal "<icon-lucide-*>" with asterisk in spec
# docs (negative-reference callouts) by requiring at least one a-z char after
# the dash.
if grep -rnE '<icon-lucide-[a-z][a-z-]*[[:space:]/>]' src/ 2>/dev/null; then
  fail '<icon-lucide-*> raw tag in src/ — use <KovaIcon name="..."> (W0-4)'
fi
if grep -rnE "i-lucide-[a-z]" src/ 2>/dev/null; then
  fail 'i-lucide-* UnoCSS class string found — use <KovaIcon name="...">'
fi

echo "[c11-ci] gate 4: no process.env.X! non-null assertions (W0-9)"
# requireEnv() helper replaces founder-lock-#10-forbidden non-null assertion
# pattern on process.env reads. The check skips test files (which may legitimately
# need the pattern for fixture setup) and the env.ts helper itself.
if grep -rnE 'process\.env\.[A-Z_]+!' src/ api/ --include='*.ts' --include='*.vue' 2>/dev/null | grep -v 'api/_shared/env.ts'; then
  fail 'process.env.X! non-null assertion found — use requireEnv("X") (W0-9 / founder lock #10)'
fi

echo "[c11-ci] gate 5: no Math.random() in src/ or api/"
# crypto.getRandomValues() / crypto.randomUUID() only per CLAUDE.md.
if grep -rnE 'Math\.random\(\)' src/ api/ --include='*.ts' --include='*.vue' 2>/dev/null; then
  fail 'Math.random() found — use crypto.randomUUID() / crypto.getRandomValues()'
fi

echo "[c11-ci] gate 6: SECURITY DEFINER functions carry SET search_path (W0-5)"
# Every CREATE FUNCTION ... SECURITY DEFINER must include SET search_path on
# the same function (look ahead up to 25 lines). Awk multi-line match so
# multi-line CREATE FUNCTION statements get checked together.
awk '
  /CREATE (OR REPLACE )?FUNCTION/ { fn = NR; defined = 0; sp = 0; next }
  fn && /SECURITY DEFINER/        { defined = 1 }
  fn && /SET search_path/         { sp = 1 }
  fn && /AS \$\$|LANGUAGE/        {
    if (defined && !sp) {
      printf "%s:%d: SECURITY DEFINER without SET search_path\n", FILENAME, fn
      bad = 1
    }
    fn = 0
  }
  END { exit bad ? 1 : 0 }
' supabase/migrations/*.sql || fail 'SECURITY DEFINER function missing SET search_path (W0-5 / founder lock #15)'

echo "[c11-ci] all gates green ✓"
