const { execSync } = require('child_process');
const path = require('path');

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
  const copyCmd = process.platform === 'win32'
    ? `xcopy /E /I /Y "${path.join(frontendDir, 'build')}" "${path.join(__dirname, '..', 'build')}"`
    : `cp -r "${path.join(frontendDir, 'build')}" "${path.join(__dirname, '..', 'build')}"`;
  console.log('Copying build to backend...');
  execSync(copyCmd, { stdio: 'inherit' });
  console.log('Postinstall frontend build completed.');
} catch (err) {
  console.warn('Postinstall script failed (continuing):', err.message || err);
}
