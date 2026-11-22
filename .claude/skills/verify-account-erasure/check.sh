#!/bin/sh
# Model-checks the account erasure model with TLC and compares each run with its expected result.
# Usage: sh .claude/skills/verify-account-erasure/check.sh [config-name ...]
# Exit 0 when every run matches its expectation, 1 otherwise. Needs mise (brew install mise).
set -eu

here=$(cd "$(dirname "$0")" && pwd)
model="$here/model"

# Pinned toolchain: Java (Temurin 25) and the TLA+ tools 1.7.4, checked against their checksum.
JAVA_TOOL="java@temurin-25"
TLA_TOOL="http:tla2tools[url=https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar,checksum=sha256:936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88]@1.7.4"

command -v mise >/dev/null || { echo "mise is not installed: brew install mise" >&2; exit 2; }
mise install --quiet "$JAVA_TOOL" "$TLA_TOOL" >/dev/null
java=$(mise which java --tool "$JAVA_TOOL")
jar="$(mise where "$TLA_TOOL")/tla2tools.jar"

# config name | expected: "pass" or the invariant that must be violated
expectations='current|pass
promise|ErasureLeavesNothing
broken-reset-no-lock|ResetNeverOutlivesErasure
broken-no-straggler-sweep|StragglerSweepCatchesEarlierWrites
whatif-writes-lock|pass'

only="$*"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
failed=0

printf '%s\n' "$expectations" | while IFS='|' read -r name expected; do
  if [ -n "$only" ] && ! printf ' %s ' "$only" | grep -q " $name "; then continue; fi
  out="$work/$name.out"
  "$java" -XX:+UseParallelGC -Djava.io.tmpdir="$work" -cp "$jar" tlc2.TLC \
    -workers 1 -cleanup -metadir "$work/$name.states" \
    -config "$model/$name.cfg" "$model/AccountErasure.tla" >"$out" 2>&1 || true
  violated=$(sed -n 's/^Error: Invariant \([A-Za-z]*\) is violated\.$/\1/p' "$out" | head -1)
  states=$(sed -n 's/^\([0-9,]*\) states generated, \([0-9,]*\) distinct states found.*/\2 distinct states/p' "$out" | tail -1)
  if grep -q "Model checking completed. No error has been found." "$out"; then
    actual=pass
  elif [ -n "$violated" ]; then
    actual=$violated
  else
    actual=error
  fi
  if [ "$actual" = "$expected" ]; then
    echo "ok    $name: $actual ($states)"
  else
    echo "FAIL  $name: expected $expected, got $actual"
    sed -n '/^Error:/,/^[0-9,]* states generated/p' "$out" | head -120
    [ "$actual" = error ] && tail -30 "$out"
    echo 1 >"$work/failed"
  fi
done

[ -f "$work/failed" ] && exit 1
exit 0
