'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

/**
 * macOS 26 (Tahoe) draws a legacy CFBundleIconFile .icns onto a system plate,
 * which nests our already-squircle artwork inside a second squircle. Shipping a
 * compiled asset catalog (Assets.car + CFBundleIconName) is what makes the icon
 * render as authored — it's what signed first-party apps do.
 *
 * Runs before code signing, so these files are covered by the signature.
 * Regenerate the catalog with `npm run icon` after changing the artwork.
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename;
  const contents = path.join(context.appOutDir, `${appName}.app`, 'Contents');
  const resources = path.join(contents, 'Resources');
  const catalog = path.join(__dirname, 'macicon');

  const car = path.join(catalog, 'Assets.car');
  const icns = path.join(catalog, 'AppIcon.icns');
  if (!fs.existsSync(car) || !fs.existsSync(icns)) {
    console.warn('  • afterPack: build/macicon missing; keeping the legacy icns only');
    return;
  }

  fs.copyFileSync(car, path.join(resources, 'Assets.car'));
  fs.copyFileSync(icns, path.join(resources, 'AppIcon.icns'));

  const plist = path.join(contents, 'Info.plist');
  const set = (key, value) => {
    try {
      execFileSync('/usr/libexec/PlistBuddy', ['-c', `Set :${key} ${value}`, plist]);
    } catch {
      execFileSync('/usr/libexec/PlistBuddy', ['-c', `Add :${key} string ${value}`, plist]);
    }
  };
  set('CFBundleIconFile', 'AppIcon');
  set('CFBundleIconName', 'AppIcon');

  console.log('  • afterPack: installed asset-catalog app icon');
};
