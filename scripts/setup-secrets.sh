#!/usr/bin/env bash
# One-time per-machine setup: load API keys for the harness from a file in
# your home directory and sync them to this repo as GitHub Actions secrets.
#
# Why: the user doesn't want to manage GEMINI_API_KEY (and friends) per repo.
# Set them once at ~/.config/harness/secrets.env, run this script in any new
# repo, and the relevant secrets are uploaded.
#
# The secrets file format is plain shell:
#   GEMINI_API_KEY=...
#   ANTHROPIC_API_KEY=...
#
# Never commit ~/.config/harness/secrets.env. It lives outside any repo.

set -eu

SECRETS_FILE="${HARNESS_SECRETS_FILE:-$HOME/.config/harness/secrets.env}"

if [ ! -f "$SECRETS_FILE" ]; then
  echo "[setup-secrets] No secrets file at $SECRETS_FILE."
  echo "[setup-secrets] Create it with one KEY=value per line:"
  echo "[setup-secrets]   mkdir -p ~/.config/harness"
  echo "[setup-secrets]   cat > ~/.config/harness/secrets.env <<EOF"
  echo "[setup-secrets]   GEMINI_API_KEY=your-key-here"
  echo "[setup-secrets]   ANTHROPIC_API_KEY=your-key-here"
  echo "[setup-secrets]   EOF"
  echo "[setup-secrets]   chmod 600 ~/.config/harness/secrets.env"
  exit 1
fi

# Operational-security warn (council R2 PR #15 security nice-to-have):
# the secrets file holds API keys; if it's world- or group-readable,
# any local user / process inheriting the same UID can read them. Warn
# the user — non-blocking, since they may have a deliberate setup.
# `stat -c %a` is GNU; on macOS use `stat -f %A`. Try GNU first.
if SECRETS_PERM="$(stat -c %a "$SECRETS_FILE" 2>/dev/null)" \
   || SECRETS_PERM="$(stat -f %A "$SECRETS_FILE" 2>/dev/null)"; then
  case "$SECRETS_PERM" in
    600|400) ;;  # owner-only read (or read+write); fine
    *)
      echo "[setup-secrets] WARNING: $SECRETS_FILE permissions are $SECRETS_PERM (recommended 600 or 400)." >&2
      echo "[setup-secrets]          chmod 600 \"$SECRETS_FILE\"  # to fix" >&2
      ;;
  esac
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "[setup-secrets] gh CLI not installed. Install from https://cli.github.com/" >&2
  exit 1
fi

# Verify we're in a git repo with a GitHub remote.
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[setup-secrets] Not in a git repo." >&2
  exit 1
fi

REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || true)"
if [ -z "$REPO" ]; then
  echo "[setup-secrets] No GitHub remote detected. Run 'gh repo create' first." >&2
  exit 1
fi

echo "[setup-secrets] Syncing to $REPO"

# Read keys from the secrets file and upload each. Lines starting with # are
# comments; blank lines are skipped. Values can be quoted or unquoted.
#
# Edge-case handling (per council R1 PR #15 bugs persona):
# - Empty file → while loop never iterates; script exits cleanly.
# - Blank line → KEY="" matches the case-skip ('') below.
# - Comment line (e.g. "# foo") → KEY=#foo matches the \#* case-skip.
# - Malformed line without "=" (e.g. "FOO") → IFS='=' splits to KEY=FOO,
#   VALUE="". The empty-value check below skips with a visible note.
# - Explicit empty value (e.g. "FOO=") → same as above, skipped with note.
# - Value containing "=" (e.g. "FOO=a=b") → KEY=FOO, VALUE="a=b".
#   Correct env-style behavior; first "=" is the separator.
# - Trailing line without newline → `|| [ -n "$KEY" ]` ensures the last
#   line is processed.
#
# Secret upload uses `gh secret set --body -` which reads the value from
# stdin (the printf pipe). This is the security-non-negotiable form per
# council R1 — the secret never appears in argv (visible to `ps`) and
# never appears in shell history.
while IFS='=' read -r KEY VALUE || [ -n "$KEY" ]; do
  case "$KEY" in
    ''|\#*) continue ;;
  esac
  # Strip surrounding quotes from value.
  VALUE="${VALUE#\"}"; VALUE="${VALUE%\"}"
  VALUE="${VALUE#\'}"; VALUE="${VALUE%\'}"
  if [ -z "$VALUE" ]; then
    echo "[setup-secrets]   skip $KEY (empty value or malformed line)"
    continue
  fi
  printf '%s' "$VALUE" | gh secret set "$KEY" --repo "$REPO" --body -
  echo "[setup-secrets]   set $KEY"
done < "$SECRETS_FILE"

echo "[setup-secrets] Done. Verify at https://github.com/$REPO/settings/secrets/actions"
