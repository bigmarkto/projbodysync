import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();

test('1. Android Configuration in app.json', () => {
  const appJsonPath = path.join(rootDir, 'app.json');
  assert.ok(fs.existsSync(appJsonPath), 'app.json must exist');
  const config = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const android = config.expo?.android;
  assert.ok(android, 'expo.android must be configured');
  assert.ok(typeof android.package === 'string' && android.package.length > 0, 'expo.android.package must be defined');
  assert.match(android.package, /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/, 'package must be valid reverse-domain format');
});

test('2. Android Native Project Scaffolding', () => {
  const requiredFiles = [
    'android/build.gradle',
    'android/app/build.gradle',
    'android/settings.gradle',
    'android/gradlew.bat',
    'android/app/src/main/AndroidManifest.xml'
  ];
  for (const relPath of requiredFiles) {
    assert.ok(fs.existsSync(path.join(rootDir, relPath)), `Expected file to exist: ${relPath}`);
  }
});

const apkEntriesCache = new Map();

function getApkEntries(apkPath) {
  if (apkEntriesCache.has(apkPath)) {
    return apkEntriesCache.get(apkPath);
  }
  const table = execSync(`tar -tf "${apkPath}"`, { encoding: 'utf8' }).replace(/\r\n/g, '\n');
  apkEntriesCache.set(apkPath, table);
  return table;
}

function getDebugApkPath() {
  return path.join(rootDir, 'android/app/build/outputs/apk/debug/app-debug.apk');
}

function getReleaseApkPath() {
  const releaseSigned = path.join(rootDir, 'android/app/build/outputs/apk/release/app-release.apk');
  const releaseUnsigned = path.join(rootDir, 'android/app/build/outputs/apk/release/app-release-unsigned.apk');
  return fs.existsSync(releaseSigned) ? releaseSigned : releaseUnsigned;
}

function verifyApk(apkPath, label) {
  assert.ok(fs.existsSync(apkPath), `${label} APK must exist at ${apkPath}`);
  const stat = fs.statSync(apkPath);
  assert.ok(stat.size > 1024 * 1024, `${label} APK size (${stat.size} bytes) must be > 1 MB`);

  // Check ZIP magic bytes 0x50 0x4B 0x03 0x04
  const fd = fs.openSync(apkPath, 'r');
  const header = Buffer.alloc(4);
  fs.readSync(fd, header, 0, 4, 0);
  fs.closeSync(fd);
  assert.deepEqual(Array.from(header), [0x50, 0x4B, 0x03, 0x04], `${label} APK must have valid ZIP magic header (0x50, 0x4B, 0x03, 0x04)`);

  // Check internal archive entries using tar
  try {
    const table = getApkEntries(apkPath);
    assert.ok(table.includes('AndroidManifest.xml'), `${label} APK must contain AndroidManifest.xml`);
    assert.ok(table.includes('classes.dex'), `${label} APK must contain classes.dex`);
    assert.ok(table.includes('resources.arsc'), `${label} APK must contain resources.arsc`);
  } catch (e) {
    console.warn(`tar inspection fallback: ${e.message}`);
    throw e;
  }
}

test('3. Debug APK Artifact Verification', () => {
  verifyApk(getDebugApkPath(), 'Debug');
});

test('4. Release APK Artifact Verification', () => {
  verifyApk(getReleaseApkPath(), 'Release');
});

test('5. AndroidManifest Cleartext Traffic Enabled for API HTTP', () => {
  const manifestPath = path.join(rootDir, 'android/app/src/main/AndroidManifest.xml');
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  const appTagMatch = manifest.match(/<application\b[^>]*>/s);
  assert.ok(appTagMatch, 'AndroidManifest.xml must declare an <application> tag');
  assert.match(
    appTagMatch[0],
    /android:usesCleartextTraffic\s*=\s*"true"/,
    'AndroidManifest.xml <application> must enable android:usesCleartextTraffic="true" so Release APKs allow http:// API requests'
  );
});

test('6. Portable Gradle CMake Staging & Metro Config Paths', () => {
  const buildGradle = fs.readFileSync(path.join(rootDir, 'android/app/build.gradle'), 'utf8');
  assert.doesNotMatch(
    buildGradle,
    /C:[\\/]dev[\\/]cxx/i,
    'android/app/build.gradle must not hardcode C:/dev/cxx'
  );
  assert.match(
    buildGradle,
    /CMAKE_STAGING_DIR|java\.io\.tmpdir/,
    'android/app/build.gradle must use portable CMAKE_STAGING_DIR or java.io.tmpdir staging path'
  );

  const metroConfig = fs.readFileSync(path.join(rootDir, 'metro.config.js'), 'utf8');
  assert.doesNotMatch(
    metroConfig,
    /C:[\\\\/]+dev[\\\\/]+projbodysync/i,
    'metro.config.js must not hardcode machine-specific C:\\dev\\projbodysync paths'
  );
  assert.match(
    metroConfig,
    /existsSync/,
    'metro.config.js must check node_modules paths dynamically with fs.existsSync'
  );
});

test('7. APK Native Libraries and Release JS Bundle Verification', () => {
  const nativeLibPattern = /^lib\/(arm64-v8a|x86_64)\/libreactnative\.so$/m;

  const debugEntries = getApkEntries(getDebugApkPath());
  assert.match(
    debugEntries,
    nativeLibPattern,
    'Debug APK must include native React Native libraries (arm64-v8a or x86_64)'
  );

  const releaseEntries = getApkEntries(getReleaseApkPath());
  assert.match(
    releaseEntries,
    nativeLibPattern,
    'Release APK must include native React Native libraries (arm64-v8a or x86_64)'
  );
  assert.match(
    releaseEntries,
    /^assets\/index\.android\.bundle$/m,
    'Release APK must embed bundled JS at assets/index.android.bundle'
  );
});
