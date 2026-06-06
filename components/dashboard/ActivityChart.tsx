'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface ChartData {
  bulan: string
  peminjaman: number
  dikembalikan: number
}

export function ActivityChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorPeminjaman" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0070f3" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0070f3" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorDikembalikan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7928ca" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7928ca" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
        <XAxis dataKey="bulan" tick={{ fill: '#8a8a8a', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#8a8a8a', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111111',
            border: '1px solid #1f1f1f',
            borderRadius: '8px',
            color: '#ffffff',
          }}
        />
        <Legend wrapperStyle={{ color: '#8a8a8a', fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="peminjaman"
          name="Peminjaman"
          stroke="#0070f3"
          strokeWidth={2}
          fill="url(#colorPeminjaman)"
        />
        <Area
          type="monotone"
          dataKey="dikembalikan"
          name="Dikembalikan"
          stroke="#7928ca"
          strokeWidth={2}
          fill="url(#colorDikembalikan)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
