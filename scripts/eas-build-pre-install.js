// EAS Build lifecycle hook (see package.json "eas-build-pre-install"), runs before `npm install`.
// expo-dev-client exists only to power `eas build --profile development`; it has no use in a
// store release and would otherwise still get autolinked into it. Drop it from the dependency
// tree before install so the production binary never carries its native code.
const fs = require('fs');
const path = require('path');

if (process.env.EAS_BUILD_PROFILE !== 'production') {
  process.exit(0);
}

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

if (pkg.dependencies && pkg.dependencies['expo-dev-client']) {
  delete pkg.dependencies['expo-dev-client'];
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('[eas-build-pre-install] Removed expo-dev-client for the production profile.');
}

// package-lock.json no longer matches the edited package.json, so `npm ci` would fail;
// delete it so EAS Build's install step falls back to `npm install`.
const lockPath = path.join(__dirname, '..', 'package-lock.json');
if (fs.existsSync(lockPath)) {
  fs.unlinkSync(lockPath);
}
