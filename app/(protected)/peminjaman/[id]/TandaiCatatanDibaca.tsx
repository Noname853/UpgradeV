'use client'

import { useEffect, useRef } from 'react'

// Membuka halaman detail dianggap "membaca" catatan pengembalian: kirim
// penanda baca sekali saat mount supaya banner di dashboard ikut hilang.
// Tidak merender apa pun.
export function TandaiCatatanDibaca({ peminjamanId }: { peminjamanId: number }) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    fetch(`/api/peminjaman/${peminjamanId}/baca-catatan`, { method: 'POST' }).catch(() => {
      /* gagal diam-diam: banner masih bisa ditandai manual dari dashboard */
    })
  }, [peminjamanId])

  return null
}
