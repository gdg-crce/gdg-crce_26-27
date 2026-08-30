import sharp from 'sharp';
import fs from 'fs';

function createIco(images) {
  const count = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + count * dirEntrySize;
  
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // count

  const dirEntries = [];
  const imageBuffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    const w = img.width >= 256 ? 0 : img.width;
    const h = img.height >= 256 ? 0 : img.height;
    entry.writeUInt8(w, 0);
    entry.writeUInt8(h, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    
    dirEntries.push(entry);
    imageBuffers.push(img.buffer);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageBuffers]);
}

async function generateAll() {
  const logoPath = 'public/logo.png';
  if (!fs.existsSync(logoPath)) {
    throw new Error('public/logo.png not found');
  }

  const trimmedLogo = await sharp(logoPath).trim().toBuffer();

  const generateSquarePng = async (size) => {
    return sharp(trimmedLogo)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  };

  console.log('Generating square PNGs...');
  const png16 = await generateSquarePng(16);
  const png32 = await generateSquarePng(32);
  const png48 = await generateSquarePng(48);
  const png96 = await generateSquarePng(96);
  const png180 = await generateSquarePng(180);
  const png192 = await generateSquarePng(192);
  const png512 = await generateSquarePng(512);

  // Write PNG files
  fs.writeFileSync('public/favicon-16x16.png', png16);
  fs.writeFileSync('public/favicon-32x32.png', png32);
  fs.writeFileSync('public/favicon-48x48.png', png48);
  fs.writeFileSync('public/favicon-96x96.png', png96);
  fs.writeFileSync('public/favicon-192x192.png', png192);
  fs.writeFileSync('public/favicon-512x512.png', png512);
  fs.writeFileSync('public/favicon.png', png512);
  fs.writeFileSync('public/apple-touch-icon.png', png180);

  fs.writeFileSync('src/app/icon.png', png512);
  fs.writeFileSync('src/app/apple-icon.png', png180);

  // Multi-resolution ICO
  console.log('Generating ICOs...');
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
    { width: 48, height: 48, buffer: png48 },
  ]);

  fs.writeFileSync('public/favicon.ico', icoBuffer);
  fs.writeFileSync('src/app/favicon.ico', icoBuffer);

  // Generate OpenGraph image (1200x630)
  console.log('Generating OpenGraph banner (1200x630)...');
  const ogLogoResized = await sharp(trimmedLogo)
    .resize(500, null, { fit: 'inside' })
    .toBuffer();
  
  const ogLogoMeta = await sharp(ogLogoResized).metadata();

  const svgBackground = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bgGlow" cx="50%" cy="42%" r="60%">
        <stop offset="0%" stop-color="#1f2438" stop-opacity="1" />
        <stop offset="60%" stop-color="#0e1017" stop-opacity="1" />
        <stop offset="100%" stop-color="#07080a" stop-opacity="1" />
      </radialGradient>
      <linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#4285F4" />
        <stop offset="33%" stop-color="#EA4335" />
        <stop offset="66%" stop-color="#FBBC04" />
        <stop offset="100%" stop-color="#34A853" />
      </linearGradient>
    </defs>
    
    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bgGlow)" />
    
    <!-- Subtle Grid Overlay -->
    <g stroke="rgba(255,255,255,0.03)" stroke-width="1">
      <line x1="0" y1="105" x2="1200" y2="105" />
      <line x1="0" y1="210" x2="1200" y2="210" />
      <line x1="0" y1="315" x2="1200" y2="315" />
      <line x1="0" y1="420" x2="1200" y2="420" />
      <line x1="0" y1="525" x2="1200" y2="525" />
      <line x1="200" y1="0" x2="200" y2="630" />
      <line x1="400" y1="0" x2="400" y2="630" />
      <line x1="600" y1="0" x2="600" y2="630" />
      <line x1="800" y1="0" x2="800" y2="630" />
      <line x1="1000" y1="0" x2="1000" y2="630" />
    </g>

    <!-- Top Accent Stripe -->
    <rect x="0" y="0" width="1200" height="4" fill="url(#accentLine)" />

    <!-- Typography -->
    <text x="600" y="440" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="52" fill="#FFFFFF" letter-spacing="-0.5">
      GDG CRCE
    </text>
    
    <text x="600" y="495" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="24" fill="#9AA0A6" letter-spacing="1">
      GOOGLE DEVELOPER GROUPS ON CAMPUS
    </text>

    <text x="600" y="540" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="18" fill="#5F6368" letter-spacing="0.5">
      Fr. Conceicao Rodrigues College of Engineering · Student Council
    </text>
  </svg>
  `;

  const ogBase = await sharp(Buffer.from(svgBackground)).png().toBuffer();
  
  const logoTop = Math.round(180 - ogLogoMeta.height / 2);
  const logoLeft = Math.round((1200 - ogLogoMeta.width) / 2);

  const finalOg = await sharp(ogBase)
    .composite([
      {
        input: ogLogoResized,
        top: logoTop,
        left: logoLeft,
      },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync('public/og-image.png', finalOg);
  fs.writeFileSync('src/app/opengraph-image.png', finalOg);

  console.log('Generating webmanifest...');
  const manifest = {
    name: 'GDG CRCE — Google Developer Group Student Council',
    short_name: 'GDG CRCE',
    description: 'The official student technical council and Google Developer Group at Fr. Conceicao Rodrigues College of Engineering (CRCE), Mumbai.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0807',
    theme_color: '#0a0807',
    icons: [
      {
        src: '/favicon-48x48.png',
        sizes: '48x48',
        type: 'image/png',
      },
      {
        src: '/favicon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: '/favicon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/favicon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };

  fs.writeFileSync('public/site.webmanifest', JSON.stringify(manifest, null, 2));

  console.log('All favicon, icon, and OG assets generated successfully!');
}

generateAll().catch(err => {
  console.error(err);
  process.exit(1);
});
