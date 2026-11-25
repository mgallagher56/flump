#!/usr/bin/env bash
# Checks the owner's development APK (E12 S2a, workflow mobile-device-apk.yml) before it is
# uploaded:
#   bash scripts/check-device-apk.sh <apk>
# The APK must carry no JavaScript bundle (Metro on the owner's computer serves it, with the
# owner's own config), and no WorkOS client id or e2e fixture value baked in.
set -euo pipefail

apk="${1:?usage: check-device-apk.sh <apk>}"
listing="$(unzip -l "$apk")"

if grep -qE 'assets/index\.android\.bundle|\.hbc$' <<<"$listing"; then
  echo "check-device-apk: the APK embeds a JavaScript bundle; it must load from Metro" >&2
  exit 1
fi

contents="$(unzip -p "$apk" 'classes*.dex' 'assets/*' 'res/*' 2>/dev/null | LC_ALL=C tr -c '[:print:]' '\n')"
# The e2e values: a build that carries them was built against the fixture server.
for marker in '10.0.2.2:8787' 'client_e2e_fixture' 'flump.example'; do
  if grep -qF "$marker" <<<"$contents"; then
    echo "check-device-apk: the APK contains ${marker}" >&2
    exit 1
  fi
done
if grep -qE 'client_[0-9A-Z]{20,}' <<<"$contents"; then
  echo "check-device-apk: the APK contains something shaped like a WorkOS client id" >&2
  exit 1
fi
if ! grep -q 'devlauncher' <<<"$contents"; then
  echo "check-device-apk: the development launcher is missing, so the owner could not open Metro" >&2
  exit 1
fi
if ! grep -q 'lib/arm64-v8a/' <<<"$listing"; then
  echo "check-device-apk: no arm64-v8a libraries, so the APK will not run on a phone" >&2
  exit 1
fi
echo "check-device-apk: OK (no JavaScript bundle, no client id or fixture value)"
