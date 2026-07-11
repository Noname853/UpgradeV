import { describe, expect, it } from 'vitest'
import { bolehAjukan, dalamJamOperasional } from './pengaturan'

describe('bolehAjukan', () => {
  it('mengizinkan apa pun saat booking terbuka', () => {
    expect(bolehAjukan(true, [{ viaScan: false }])).toBe(true)
    expect(bolehAjukan(true, [{ viaScan: false }, { viaScan: true }])).toBe(true)
    expect(bolehAjukan(true, [])).toBe(true)
  })

  it('menolak pengajuan pilih-daftar saat ditutup', () => {
    expect(bolehAjukan(false, [{ viaScan: false }])).toBe(false)
    expect(bolehAjukan(false, [{ viaScan: true }, { viaScan: false }])).toBe(false)
  })

  it('mengizinkan pengajuan yang semuanya hasil scan saat ditutup', () => {
    expect(bolehAjukan(false, [{ viaScan: true }])).toBe(true)
    expect(bolehAjukan(false, [{ viaScan: true }, { viaScan: true }])).toBe(true)
  })
})

describe('dalamJamOperasional', () => {
  it('true di tengah jam operasional (10:00 WIB)', () => {
    expect(dalamJamOperasional(new Date('2026-07-11T03:00:00Z'))).toBe(true)
  })

  it('true tepat jam buka (06:00 WIB)', () => {
    expect(dalamJamOperasional(new Date('2026-07-10T23:00:00Z'))).toBe(true)
  })

  it('false sebelum jam buka (05:00 WIB)', () => {
    expect(dalamJamOperasional(new Date('2026-07-10T22:00:00Z'))).toBe(false)
  })

  it('false tepat jam tutup (17:00 WIB) dan setelahnya', () => {
    expect(dalamJamOperasional(new Date('2026-07-11T10:00:00Z'))).toBe(false)
    expect(dalamJamOperasional(new Date('2026-07-11T12:00:00Z'))).toBe(false)
  })
})
