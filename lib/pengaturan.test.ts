import { describe, expect, it } from 'vitest'
import { bolehAjukan } from './pengaturan'

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
