'use client'

import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Cell,
  LabelList,
} from 'recharts'

interface ChartData {
  bulan: string
  peminjaman: number
  dikembalikan: number
}

// Grafik aktivitas harian gaya "dashboard modern": batang membulat untuk
// peminjaman, garis untuk dikembalikan, dan batang HARI INI (data terakhir)
// disorot lebih terang + diberi label angka.
export function ActivityChart({ data }: { data: ChartData[] }) {
  const lastIndex = data.length - 1

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 22, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="barDikembalikan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7e22ce" />
          </linearGradient>
          <linearGradient id="barToday" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d8b4fe" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
        <XAxis
          dataKey="bulan"
          tick={{ fill: '#8a8a8a', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fill: '#8a8a8a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'rgba(92,132,255,0.08)' }}
          contentStyle={{
            backgroundColor: '#111111',
            border: '1px solid #1f1f1f',
            borderRadius: '8px',
            color: '#ffffff',
          }}
          labelFormatter={(v) => `Tanggal ${v}`}
        />
        <Legend wrapperStyle={{ color: '#8a8a8a', fontSize: 12 }} />
        <Bar dataKey="dikembalikan" name="Dikembalikan" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={26}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === lastIndex ? 'url(#barToday)' : 'url(#barDikembalikan)'} />
          ))}
          <LabelList
            dataKey="dikembalikan"
            content={(p) => {
              const { x = 0, y = 0, width = 0, index = 0, value } = p as {
                x?: number
                y?: number
                width?: number
                index?: number
                value?: number
              }
              if (index !== lastIndex || !value) return null
              return (
                <text
                  x={Number(x) + Number(width) / 2}
                  y={Number(y) - 6}
                  fill="#e9d5ff"
                  fontSize={11}
                  fontWeight={500}
                  textAnchor="middle"
                >
                  {value}
                </text>
              )
            }}
          />
        </Bar>
        <Line
          type="monotone"
          dataKey="peminjaman"
          name="Peminjaman"
          stroke="#5c84ff"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#5c84ff', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
