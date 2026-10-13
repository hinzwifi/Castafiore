const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const publicFontsDir = path.join(publicDir, 'fonts');
const distDir = path.join(rootDir, 'dist');
const distFontsDir = path.join(distDir, 'fonts');

// Potential locations for FontAwesome.ttf
const candidateFontPaths = [
  path.join(publicFontsDir, 'FontAwesome.ttf'),
  path.join(rootDir, 'node_modules', 'react-native-vector-icons', 'Fonts', 'FontAwesome.ttf'),
  path.join(rootDir, 'node_modules', '@expo', 'vector-icons', 'build', 'vendor', 'react-native-vector-icons', 'Fonts', 'FontAwesome.ttf'),
];

let fontSourcePath = null;
for (const p of candidateFontPaths) {
  if (fs.existsSync(p)) {
    fontSourcePath = p;
    break;
  }
}

if (!fontSourcePath) {
  console.error('[prepare-web-build] Error: Could not find FontAwesome.ttf in candidates:', candidateFontPaths);
  process.exit(1);
}

// 1. Ensure public/fonts/FontAwesome.ttf exists
fs.mkdirSync(publicFontsDir, { recursive: true });
const targetPublicFont = path.join(publicFontsDir, 'FontAwesome.ttf');
if (!fs.existsSync(targetPublicFont) || fs.statSync(targetPublicFont).size === 0) {
  fs.copyFileSync(fontSourcePath, targetPublicFont);
  console.log('[prepare-web-build] Copied FontAwesome.ttf to public/fonts/');
}

// 2. If dist directory exists, ensure dist/fonts/FontAwesome.ttf exists
if (fs.existsSync(distDir)) {
  fs.mkdirSync(distFontsDir, { recursive: true });
  fs.copyFileSync(targetPublicFont, path.join(distFontsDir, 'FontAwesome.ttf'));
  console.log('[prepare-web-build] Copied FontAwesome.ttf to dist/fonts/');
}

// 3. Encode font as base64
const fontBuffer = fs.readFileSync(targetPublicFont);
const fontBase64 = fontBuffer.toString('base64');
console.log(`[prepare-web-build] Encoded FontAwesome font (${fontBuffer.length} bytes, base64 ${fontBase64.length} chars)`);

const fontInjectionBlock = `<!-- BEGIN: FontAwesome Preload & Base64 Fallback -->
  <link rel="preload" href="./fonts/FontAwesome.ttf" as="font" type="font/ttf" crossorigin="anonymous" />
  <style id="expo-generated-fonts">
    @font-face {
      font-family: FontAwesome;
      src: url("data:font/truetype;charset=utf-8;base64,${fontBase64}") format("truetype"),
           url("./fonts/FontAwesome.ttf") format("truetype");
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }
    @font-face {
      font-family: 'FontAwesome';
      src: url("data:font/truetype;charset=utf-8;base64,${fontBase64}") format("truetype"),
           url("./fonts/FontAwesome.ttf") format("truetype");
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }
  </style>
  <!-- END: FontAwesome Preload & Base64 Fallback -->`;

function injectIntoHtml(filePath) {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');

  const markerRegex = /<!-- BEGIN: FontAwesome Preload & Base64 Fallback -->[\s\S]*?<!-- END: FontAwesome Preload & Base64 Fallback -->/;
  if (markerRegex.test(html)) {
    html = html.replace(markerRegex, fontInjectionBlock);
    console.log(`[prepare-web-build] Updated font injection in ${path.relative(rootDir, filePath)}`);
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', `  ${fontInjectionBlock}\n</head>`);
    console.log(`[prepare-web-build] Injected font block into ${path.relative(rootDir, filePath)}`);
  } else {
    console.warn(`[prepare-web-build] Warning: Could not find </head> in ${filePath}`);
    return;
  }

  fs.writeFileSync(filePath, html, 'utf8');
}

// 4. Inject into public/index.html
injectIntoHtml(path.join(publicDir, 'index.html'));

// 5. If dist/index.html exists, inject into dist/index.html
if (fs.existsSync(distDir)) {
  injectIntoHtml(path.join(distDir, 'index.html'));
}

console.log('[prepare-web-build] Complete!');
