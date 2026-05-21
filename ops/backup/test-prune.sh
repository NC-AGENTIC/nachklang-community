#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
. "$DIR/lib-prune.sh"

fail=0
run_case() { # $1=desc  $2=keep_d  $3=keep_w  $4=keep_m  (fixture on stdin)  $5=expected deletes (newline-sep)
  local desc=$1 kd=$2 kw=$3 km=$4 expected=$5 got
  got="$(gfs_plan "$kd" "$kw" "$km" | sort)"
  expected="$(printf '%s\n' "$expected" | sed '/^$/d' | sort)"
  if [ "$got" = "$expected" ]; then
    echo "PASS: $desc"
  else
    echo "FAIL: $desc"; printf '  expected:\n%s\n  actual:\n%s\n' "$expected" "$got"; fail=1
  fi
}

# Case A — daily tier only: keep 2 newest days, delete the 2 older.
run_case "A daily keep2" 2 0 0 "$(cat <<'EXP'
nachklang-2026-05-19T030000Z.dump.age
nachklang-2026-05-18T030000Z.dump.age
EXP
)" <<'IN'
nachklang-2026-05-21T030000Z.dump.age
nachklang-2026-05-20T030000Z.dump.age
nachklang-2026-05-19T030000Z.dump.age
nachklang-2026-05-18T030000Z.dump.age
IN

# Case B — multiple per day: daily tier keeps the NEWEST file of the kept day.
run_case "B newest-per-day" 1 0 0 "$(cat <<'EXP'
nachklang-2026-05-21T030000Z.dump.age
nachklang-2026-05-20T030000Z.dump.age
EXP
)" <<'IN'
nachklang-2026-05-21T060000Z.dump.age
nachklang-2026-05-21T030000Z.dump.age
nachklang-2026-05-20T030000Z.dump.age
IN

# Case C — weekly tier: 3 consecutive weeks, keep 2 newest, delete oldest.
run_case "C weekly keep2" 0 2 0 "$(cat <<'EXP'
nachklang-2026-05-07T030000Z.dump.age
EXP
)" <<'IN'
nachklang-2026-05-21T030000Z.dump.age
nachklang-2026-05-14T030000Z.dump.age
nachklang-2026-05-07T030000Z.dump.age
IN

# Case D — monthly tier: 3 months, keep 2 newest, delete oldest.
run_case "D monthly keep2" 0 0 2 "$(cat <<'EXP'
nachklang-2026-03-21T030000Z.dump.age
EXP
)" <<'IN'
nachklang-2026-05-21T030000Z.dump.age
nachklang-2026-04-21T030000Z.dump.age
nachklang-2026-03-21T030000Z.dump.age
IN

# Case E — union collapses: newest file satisfies all three tiers.
run_case "E union collapse" 1 1 1 "$(cat <<'EXP'
nachklang-2026-05-14T030000Z.dump.age
nachklang-2026-04-21T030000Z.dump.age
EXP
)" <<'IN'
nachklang-2026-05-21T030000Z.dump.age
nachklang-2026-05-14T030000Z.dump.age
nachklang-2026-04-21T030000Z.dump.age
IN

# Case F — union across tiers picks different files; only the oldest is dropped.
run_case "F union spread" 1 2 2 "$(cat <<'EXP'
nachklang-2026-03-15T030000Z.dump.age
EXP
)" <<'IN'
nachklang-2026-05-21T030000Z.dump.age
nachklang-2026-05-14T030000Z.dump.age
nachklang-2026-04-30T030000Z.dump.age
nachklang-2026-03-15T030000Z.dump.age
IN

# Case G — all-zero retention must still preserve the single newest backup (data-loss guard).
run_case "G all-zero keeps newest" 0 0 0 "$(cat <<'EXP'
nachklang-2026-05-14T030000Z.dump.age
nachklang-2026-04-21T030000Z.dump.age
EXP
)" <<'IN'
nachklang-2026-05-21T030000Z.dump.age
nachklang-2026-05-14T030000Z.dump.age
nachklang-2026-04-21T030000Z.dump.age
IN

exit $fail
