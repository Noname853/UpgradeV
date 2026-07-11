import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    // Samakan dengan alias tsconfig ("@/*" -> root) agar impor "@/lib/..."
    // resolve di test yang menyentuh modul non-test.
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', '__tests__/**/*.test.ts'],
  },
})
