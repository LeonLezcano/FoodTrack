import fs from 'fs';

const versionData = JSON.parse(fs.readFileSync('version.json', 'utf8'));
const parts = versionData.version.replace(/^v/, '').split('.');
parts[2] = String(Number(parts[2]) + 1).padStart(2, '0');
const nextTag = 'v' + parts.join('.');
const nextSemver = parts.join('.');

versionData.version = nextTag;
versionData.build = (Number(versionData.build) || 0) + 1;
versionData.releasedAt = new Date().toISOString();
fs.writeFileSync('version.json', JSON.stringify(versionData, null, 2) + '\n', 'utf8');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = nextSemver;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n', 'utf8');

const sw = fs.readFileSync('sw.js', 'utf8').replace(
  /const CACHE_NAME = 'foodtrack-cache-v[^']+';/,
  `const CACHE_NAME = 'foodtrack-cache-${nextTag}';`
);
fs.writeFileSync('sw.js', sw, 'utf8');

const html = fs.readFileSync('index.html', 'utf8').replace(
  /FoodTrack v\d+\.\d+\.\d+/g,
  `FoodTrack ${nextTag}`
).replace(
  /(<span class="text-xs font-mono text-\[#fb923c\] font-semibold">)v\d+\.\d+\.\d+(<\/span>)/,
  `$1${nextTag}$2`
);
fs.writeFileSync('index.html', html, 'utf8');

console.log(nextTag);
