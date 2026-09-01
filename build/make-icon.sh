#!/bin/bash
# Regenerates the macOS app icon from build/icon-source.png.
# Produces both the legacy .icns and the asset catalog that macOS 26 needs.
# Requires Xcode (for actool); the committed output in build/macicon lets the
# app build on machines without it.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=build/icon-source.png
[ -f "$SRC" ] || { echo "missing $SRC"; exit 1; }

rm -rf icon.iconset && mkdir -p icon.iconset
for s in 16 32 128 256 512; do
  sips -z $s $s "$SRC" --out "icon.iconset/icon_${s}x${s}.png" >/dev/null
  sips -z $((s*2)) $((s*2)) "$SRC" --out "icon.iconset/icon_${s}x${s}@2x.png" >/dev/null
done
rm -f build/icon.icns
iconutil -c icns icon.iconset -o build/icon.icns
rm -rf icon.iconset
echo "✓ build/icon.icns"

if ! command -v actool >/dev/null; then
  echo "! actool not found (needs Xcode) — keeping the existing build/macicon"
  exit 0
fi
SET=build/Assets.xcassets/AppIcon.appiconset
rm -rf build/Assets.xcassets && mkdir -p "$SET"
python3 - "$SRC" "$SET" <<'PY'
import json, subprocess, sys, os
src, base = sys.argv[1], sys.argv[2]
images = []
for s in (16, 32, 128, 256, 512):
    for scale in (1, 2):
        fn = f'icon_{s}x{s}{"@2x" if scale == 2 else ""}.png'
        subprocess.run(['sips','-z',str(s*scale),str(s*scale),src,'--out',os.path.join(base,fn)],
                       capture_output=True, check=True)
        images.append({"size":f"{s}x{s}","idiom":"mac","filename":fn,"scale":f"{scale}x"})
json.dump({"images":images,"info":{"version":1,"author":"xcode"}}, open(os.path.join(base,'Contents.json'),'w'), indent=2)
json.dump({"info":{"version":1,"author":"xcode"}}, open(os.path.join(base,'..','Contents.json'),'w'), indent=2)
PY
rm -rf build/macicon && mkdir -p build/macicon
actool build/Assets.xcassets --compile build/macicon --app-icon AppIcon \
  --minimum-deployment-target 11.0 --platform macosx \
  --output-partial-info-plist build/macicon/partial.plist >/dev/null
rm -rf build/Assets.xcassets build/macicon/partial.plist
echo "✓ build/macicon/{Assets.car,AppIcon.icns}"
