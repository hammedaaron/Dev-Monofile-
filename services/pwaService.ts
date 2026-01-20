
/**
 * PWA Architect Service - v3.1 (Production Grade)
 * Generates specific naming conventions, strict 1:1 aspect ratio assets,
 * and a functional offline service worker.
 */

export interface PWAConfig {
  name: string;
  shortName: string;
  themeColor: string;
}

export const generatePWAAssets = async (
  file: File, 
  config: PWAConfig
): Promise<{ 
  blobs: Record<string, Blob>, 
  manifest: string, 
  indexHtml: string,
  metaTags: string 
}> => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  // 1. Strict 1:1 Ratio Validation
  const ratio = img.width / img.height;
  if (Math.abs(ratio - 1) > 0.05) {
    URL.revokeObjectURL(url);
    throw new Error("ASPECT_RATIO_INVALID: Image must be a 1:1 square.");
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not initialize 2D context");

  const blobs: Record<string, Blob> = {};
  
  // Specific size map based on industry standards
  const targetFiles = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon.ico', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
  ];

  for (const target of targetFiles) {
    canvas.width = target.size;
    canvas.height = target.size;
    ctx.clearRect(0, 0, target.size, target.size);
    ctx.drawImage(img, 0, 0, target.size, target.size);

    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
    blobs[target.name] = blob;
  }

  URL.revokeObjectURL(url);

  // 2. Generate sw.js (Stale-While-Revalidate Strategy)
  const swJs = `
const CACHE_NAME = 'pwa-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/site.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
        return response || fetchPromise;
      });
    })
  );
});
  `.trim();
  blobs['sw.js'] = new Blob([swJs], { type: 'application/javascript' });

  // 3. Generate site.webmanifest
  const manifest = JSON.stringify({
    name: config.name,
    short_name: config.shortName,
    icons: [
      { 
        src: "/android-chrome-192x192.png", 
        sizes: "192x192", 
        type: "image/png",
        purpose: "any maskable" 
      },
      { 
        src: "/android-chrome-512x512.png", 
        sizes: "512x512", 
        type: "image/png",
        purpose: "any maskable" 
      }
    ],
    theme_color: config.themeColor,
    background_color: "#ffffff",
    display: "standalone",
    orientation: "portrait",
    scope: "/",
    start_url: "/"
  }, null, 2);

  // 4. Generate Header Tags for easy copying (with iOS Polish)
  const metaTags = `
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="msapplication-TileColor" content="${config.themeColor}">
<meta name="theme-color" content="${config.themeColor}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${config.shortName}">
  `.trim();

  // 5. Generate Starter index.html
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.name}</title>
    ${metaTags}
</head>
<body>
    <div id="root">
        <h1>${config.name} is running</h1>
        <p>PWA Assets successfully deployed.</p>
    </div>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
        });
      }
    </script>
</body>
</html>
  `.trim();

  return { blobs, manifest, indexHtml, metaTags };
};
