// Service worker minimal untuk PWA Inventaris TKJ.
// Tidak melakukan precaching (halaman dirender dinamis + CSP nonce per-request,
// jadi cache HTML justru berbahaya). Tugasnya hanya satu: memberi halaman
// fallback yang ramah saat perangkat offline, alih-alih error bawaan browser.

const HALAMAN_OFFLINE = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Offline — Inventaris TKJ</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #000; color: #fff; font-family: system-ui, sans-serif; text-align: center; }
    .kotak { padding: 2rem; }
    h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
    p { color: #9ca3af; margin: 0 0 1.5rem; font-size: .9rem; }
    button { background: linear-gradient(135deg, #0070f3, #7928ca); color: #fff; border: 0;
      border-radius: .5rem; padding: .625rem 1.5rem; font-size: .9rem; cursor: pointer; }
  </style>
</head>
<body>
  <div class="kotak">
    <h1>Tidak ada koneksi internet</h1>
    <p>Inventaris TKJ membutuhkan koneksi untuk memuat data peminjaman.</p>
    <button onclick="location.reload()">Coba lagi</button>
  </div>
</body>
</html>`

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Hanya tangani navigasi halaman; request lain (API, aset) dibiarkan normal.
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(HALAMAN_OFFLINE, {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
    )
  )
})
