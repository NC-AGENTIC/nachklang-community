#!/usr/bin/env bash
# GFS retention for NachKlang backups.
#   gfs_plan <keep_daily> <keep_weekly> <keep_monthly>   reads basenames on stdin,
#       prints the basenames to DELETE on stdout. PURE: no filesystem side effects.
#   prune_gfs <dir> <keep_daily> <keep_weekly> <keep_monthly>   deletes the planned files
#       (and their .sha256 sidecars) from <dir>.
# Backup names look like: nachklang-2026-05-21T030000Z.dump.age

# Days since 1970-01-01 for a Gregorian date (Howard Hinnant's algorithm). Pure integer math
# (no `date`), so weekly bucketing is portable across BSD/GNU and runs in tests anywhere.
_days_from_civil() {
  local y=$((10#$1)) m=$((10#$2)) d=$((10#$3)) era yoe doy doe mp
  if [ "$m" -le 2 ]; then y=$((y - 1)); fi
  if [ "$y" -ge 0 ]; then era=$((y / 400)); else era=$(((y - 399) / 400)); fi
  yoe=$((y - era * 400))
  if [ "$m" -gt 2 ]; then mp=$((m - 3)); else mp=$((m + 9)); fi
  doy=$(( (153 * mp + 2) / 5 + d - 1 ))
  doe=$(( yoe * 365 + yoe / 4 - yoe / 100 + doy ))
  echo $(( era * 146097 + doe - 719468 ))
}

# Echo "<ts> <daykey> <weekkey> <monthkey>" for a backup name (path or basename).
_keys_for() {
  local name=${1##*/}
  local ts=${name#nachklang-}; ts=${ts%.dump.age}
  local daykey="${ts:0:10}" monthkey="${ts:0:7}" dnum weekkey
  dnum=$(_days_from_civil "${ts:0:4}" "${ts:5:2}" "${ts:8:2}")
  weekkey=$(( (dnum + 3) / 7 ))   # Monday-aligned 7-day bucket
  echo "$ts $daykey $weekkey $monthkey"
}

# stdin: sorted-desc rows "ts|name|daykey|weekkey|monthkey". $1=field(3/4/5) $2=keep.
# Prints keeper names: the newest file for each of the first <keep> distinct bucket keys.
_tier_keepers() {
  local field=$1 keep=$2 seen="|" count=0 ts name daykey weekkey monthkey key
  [ "$keep" -le 0 ] && return 0
  while IFS='|' read -r ts name daykey weekkey monthkey; do
    [ -z "$ts" ] && continue
    case "$field" in 3) key=$daykey;; 4) key=$weekkey;; 5) key=$monthkey;; esac
    case "$seen" in *"|$key|"*) continue;; esac
    seen="$seen$key|"; echo "$name"
    count=$((count + 1)); [ "$count" -ge "$keep" ] && break
  done
}

gfs_plan() {
  local keep_daily=$1 keep_weekly=$2 keep_monthly=$3
  local names=() rows=() n line ts daykey weekkey monthkey
  while IFS= read -r line; do [ -n "$line" ] && names+=("$line"); done
  [ "${#names[@]}" -eq 0 ] && return 0
  for n in "${names[@]}"; do
    read -r ts daykey weekkey monthkey <<<"$(_keys_for "$n")"
    rows+=("$ts|$n|$daykey|$weekkey|$monthkey")
  done
  local sorted; sorted=$(printf '%s\n' "${rows[@]}" | sort -r)
  # Invariant: never delete the single newest backup, regardless of tier counts. Guards against
  # a misconfigured all-zero retention wiping the backup that was just created.
  local newest; newest=$(printf '%s\n' "$sorted" | head -1 | cut -d'|' -f2)
  local keepers="|$newest|" k
  while IFS= read -r k; do [ -n "$k" ] && keepers="$keepers$k|"; done < <(
    _tier_keepers 3 "$keep_daily"   <<<"$sorted"
    _tier_keepers 4 "$keep_weekly"  <<<"$sorted"
    _tier_keepers 5 "$keep_monthly" <<<"$sorted"
  )
  for n in "${names[@]}"; do
    case "$keepers" in *"|$n|"*) ;; *) echo "$n";; esac
  done
}

prune_gfs() {
  local dir=$1 keep_daily=$2 keep_weekly=$3 keep_monthly=$4 f
  ls -1 "$dir"/nachklang-*.dump.age 2>/dev/null | xargs -r -n1 basename \
    | gfs_plan "$keep_daily" "$keep_weekly" "$keep_monthly" \
    | while IFS= read -r f; do
        [ -n "$f" ] && rm -f -- "$dir/$f" "$dir/$f.sha256"
      done
}
