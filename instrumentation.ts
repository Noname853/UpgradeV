// Dijalankan Next.js sekali setiap instance server dinyalakan, sebelum
// melayani request — dipakai untuk penambal skema idempoten (lihat
// lib/startup-migrations.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runStartupMigrations } = await import('@/lib/startup-migrations')
    await runStartupMigrations()
  }
}
