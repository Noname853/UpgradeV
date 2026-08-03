'use client'

import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

// Input password dengan tombol ikon mata untuk menampilkan/menyembunyikan.
// Default tersembunyi; klik mata → tampil, klik lagi → sembunyi.
// Menerima semua atribut input biasa (name, id, value, onChange, required, dll),
// jadi cocok untuk form terkontrol (register) maupun server action (login).
export function PasswordInput({ className = '', ...props }: Props) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Sembunyikan password' : 'Lihat password'}
        aria-pressed={show}
        tabIndex={-1}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 transition hover:text-blue-300"
      >
        {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  )
}
