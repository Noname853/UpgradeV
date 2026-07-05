import type { NextConfig } from "next";

// Content-Security-Policy diset per-request di proxy.ts (berbasis nonce).
// Header keamanan lain di bawah bersifat statis untuk semua respons.

const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
  allowedDevOrigins: [
    '192.168.*.*',
    '10.*.*.*',
    '172.*.*.*',
  ],
  devIndicators: false,
  experimental: {
    serverActions: {
      // 5 MB is enough for xlsx import (max reasonable spreadsheet).
      // The import action also enforces MAX_UPLOAD_BYTES at runtime.
      bodySizeLimit: '5mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          // camera=(self): dipakai fitur scan QR di form peminjaman.
          // Origin lain (iframe pihak ketiga) tetap tidak boleh akses kamera.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Isolasi konteks browsing (defense-in-depth). COEP sengaja TIDAK
          // di-set agar gambar lintas-origin (foto alat dari Imgur dll) tetap muat.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
