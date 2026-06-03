import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');

// 1. Get version from package.json
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
console.log(`[Build] Current version in package.json: ${version}`);

// 2. Synchronize src-tauri/tauri.conf.json version
const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  if (tauriConf.version !== version) {
    console.log(`[Build] Updating tauri.conf.json version from ${tauriConf.version} to ${version}`);
    tauriConf.version = version;
    fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');
  } else {
    console.log(`[Build] tauri.conf.json version is already ${version}`);
  }
} else {
  console.warn(`[Build] Warning: tauri.conf.json not found at ${tauriConfPath}`);
}

// 3. Synchronize src-tauri/Cargo.toml version
const cargoPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
if (fs.existsSync(cargoPath)) {
  let cargoContent = fs.readFileSync(cargoPath, 'utf8');
  const packageMatch = cargoContent.match(/\[package\]([\s\S]*?)(?:\[|$)/);
  if (packageMatch) {
    const packageSection = packageMatch[1];
    const versionMatch = packageSection.match(/version\s*=\s*"([^"]+)"/);
    if (versionMatch && versionMatch[1] !== version) {
      console.log(`[Build] Updating Cargo.toml version from ${versionMatch[1]} to ${version}`);
      const updatedPackageSection = packageSection.replace(/version\s*=\s*"[^"]+"/, `version = "${version}"`);
      cargoContent = cargoContent.replace(packageSection, updatedPackageSection);
      fs.writeFileSync(cargoPath, cargoContent, 'utf8');
    } else if (versionMatch) {
      console.log(`[Build] Cargo.toml version is already ${version}`);
    }
  }
} else {
  console.warn(`[Build] Warning: Cargo.toml not found at ${cargoPath}`);
}

// 4. Run 'tauri build'
console.log('[Build] Starting Tauri compilation...');
const isWindows = process.platform === 'win32';
const tauriBuildCmd = isWindows ? 'npx.cmd' : 'npx';
const args = ['tauri', 'build'];

const buildProcess = spawn(tauriBuildCmd, args, {
  stdio: 'inherit',
  shell: true,
  cwd: rootDir
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`[Build] Error: Tauri build failed with exit code ${code}`);
    process.exit(code);
  }
  
  console.log('[Build] Tauri build completed successfully. Copying artifacts...');
  copyArtifacts();
});

function copyArtifacts() {
  const releasesDir = path.join(rootDir, 'releases');
  
  // Ensure releases directory exists
  if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir, { recursive: true });
  }

  // Copy Standalone Exe
  const exeSrcPath = path.join(rootDir, 'src-tauri', 'target', 'release', 'workers-manager.exe');
  if (fs.existsSync(exeSrcPath)) {
    const exeDestPath = path.join(releasesDir, `open-workers-manager-v${version}.exe`);
    try {
      fs.copyFileSync(exeSrcPath, exeDestPath);
      console.log(`[Build] Copied standalone executable: ${exeDestPath}`);
    } catch (err) {
      console.error(`[Build] Failed to copy standalone executable: ${err.message}`);
    }
  } else {
    console.warn(`[Build] Warning: Standalone executable not found at ${exeSrcPath}`);
  }

  // Copy NSIS installer
  const nsisDir = path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
  if (fs.existsSync(nsisDir)) {
    const files = fs.readdirSync(nsisDir);
    let copiedNsis = false;
    files.forEach(file => {
      if (file.endsWith('.exe')) {
        const srcPath = path.join(nsisDir, file);
        const destPath = path.join(releasesDir, `open-workers-manager-v${version}-setup.exe`);
        try {
          fs.copyFileSync(srcPath, destPath);
          console.log(`[Build] Copied installer: ${destPath}`);
          copiedNsis = true;
        } catch (err) {
          console.error(`[Build] Failed to copy installer ${file}: ${err.message}`);
        }
      }
    });
    if (!copiedNsis) {
      console.warn('[Build] Warning: No installer exe found in NSIS directory.');
    }
  } else {
    console.warn(`[Build] Warning: NSIS bundle directory not found at ${nsisDir}`);
  }

  // Copy MSI installer (if target list included msi)
  const msiDir = path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle', 'msi');
  if (fs.existsSync(msiDir)) {
    const files = fs.readdirSync(msiDir);
    files.forEach(file => {
      if (file.endsWith('.msi')) {
        const srcPath = path.join(msiDir, file);
        const destPath = path.join(releasesDir, `open-workers-manager-v${version}.msi`);
        try {
          fs.copyFileSync(srcPath, destPath);
          console.log(`[Build] Copied MSI: ${destPath}`);
        } catch (err) {
          console.error(`[Build] Failed to copy MSI ${file}: ${err.message}`);
        }
      }
    });
  }

  console.log('[Build] All artifact copying processes are complete!');
}
