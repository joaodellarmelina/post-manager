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

  // Electron ships its binaries with a linker-signed ad-hoc signature whose
  // identifier is literally "Electron". Adding our files and editing
  // Info.plist invalidates it, and macOS reports an invalid signature as
  // "app is damaged and can't be opened" once the download carries a
  // quarantine flag. Re-sign the finished bundle ad-hoc so the signature
  // actually matches its contents. (Ad-hoc is not notarised — Gatekeeper
  // still asks the user to confirm — but the app is no longer "damaged".)
  const appPath = path.join(context.appOutDir, `${appName}.app`);
  try {
    execFileSync('codesign', [
      '--force', '--deep', '--sign', '-',
      '--identifier', context.packager.appInfo.id,
      appPath,
    ], { stdio: 'pipe' });
    execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'pipe' });
    console.log('  • afterPack: ad-hoc signature applied and verified');
  } catch (err) {
    throw new Error(`ad-hoc signing failed: ${err.stderr?.toString() || err.message}`);
  }
};
