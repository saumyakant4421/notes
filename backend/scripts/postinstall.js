const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

if (process.env.CI === 'true') {
  console.log('CI environment detected, skipping frontend build.');
  process.exit(0);
}

try {
  const frontendDir = path.join(__dirname, '..', 'frontend');
  console.log('Installing frontend dependencies...');
  execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });
  console.log('Building frontend...');
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
  console.log('Copying build to backend using fs.cp...');
  const src = path.join(frontendDir, 'build');
  const dest = path.join(__dirname, '..', 'build');
  try {
    if (fs.cp) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      // fallback: manual copy
      const copyRecursiveSync = (srcDir, destDir) => {
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        const entries = fs.readdirSync(srcDir, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(srcDir, entry.name);
          const destPath = path.join(destDir, entry.name);
          if (entry.isDirectory()) copyRecursiveSync(srcPath, destPath);
          else fs.copyFileSync(srcPath, destPath);
        }
      };
      copyRecursiveSync(src, dest);
    }
  } catch (copyErr) {
    console.warn('Failed to copy frontend build via fs.cp:', copyErr && copyErr.message ? copyErr.message : copyErr);
    throw copyErr;
  }
  console.log('Postinstall frontend build completed.');
} catch (err) {
  console.warn('Postinstall script failed (continuing):', err.message || err);
}
