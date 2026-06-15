import Link from 'next/link'
import { rules } from '@/lib/rules'

const stats = [
  { value: '2 ROLE', label: 'ADMIN & SISWA', hex: '#5c84ff', rgb: '92,132,255' },
  { value: 'REAL-TIME', label: 'STOK TERSEDIA', hex: '#c084fc', rgb: '168,85,247' },
  { value: '100%', label: 'OPEN SOURCE', hex: '#b07cff', rgb: '168,85,247' },
]

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#04070c',
        color: '#e8f2f7',
        fontFamily: "'Rajdhani', sans-serif",
        overflowX: 'hidden',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&family=Rajdhani:wght@400;500;600;700&display=swap');
        @keyframes tkjRise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tkjScan { 0% { transform: translateY(-120px); opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { transform: translateY(860px); opacity: 0; } }
        @keyframes tkjGrid { from { transform: translateY(0); } to { transform: translateY(64px); } }
        @keyframes tkjPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        @keyframes tkjShimmer { from { transform: translateX(-130%) skewX(-20deg); } to { transform: translateX(330%) skewX(-20deg); } }
        @keyframes tkjBlink { 0%, 100% { opacity: 0.9; } 50% { opacity: 0.4; } }
        .tkj-card { transition: transform 0.25s, border-color 0.25s; }
        .tkj-card:hover { transform: translateY(-5px); border-color: var(--hc); }
        .tkj-cta { transition: transform 0.2s; }
        .tkj-cta:hover { transform: translateY(-3px); }
        .tkj-cta2 { transition: background 0.2s, transform 0.2s; }
        .tkj-cta2:hover { background: rgba(92,132,255,0.12); transform: translateY(-3px); }
        @media (prefers-reduced-motion: reduce) {
          .tkj-card, .tkj-cta, .tkj-cta2, [data-anim] { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* ===== NAVBAR (garis aksen) ===== */}
      <div
        style={{
          height: 2,
          background:
            'linear-gradient(90deg, transparent, #5c84ff 30%, #a855f7 70%, transparent)',
          opacity: 0.6,
        }}
      />

      {/* ===== HERO ===== */}
      <section
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '96px 20px 110px',
          overflow: 'hidden',
        }}
      >
        <div
          data-anim
          style={{
            position: 'absolute',
            inset: '-64px 0 0 0',
            backgroundImage:
              'linear-gradient(rgba(92,132,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(92,132,255,0.06) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            animation: 'tkjGrid 6s linear infinite',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '45%',
            width: 640,
            height: 640,
            transform: 'translate(-50%, -50%)',
            background:
              'radial-gradient(circle, rgba(92,132,255,0.12) 0%, rgba(168,85,247,0.06) 40%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          data-anim
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 90,
            background:
              'linear-gradient(180deg, transparent, rgba(92,132,255,0.07) 50%, rgba(92,132,255,0.18) 98%, rgba(92,132,255,0.5) 100%)',
            animation: 'tkjScan 7s linear infinite',
            pointerEvents: 'none',
          }}
        />

        {/* Badge */}
        <div
          data-anim
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 28,
            padding: '8px 20px',
            border: '1px solid rgba(92,132,255,0.35)',
            background: 'rgba(92,132,255,0.05)',
            clipPath:
              'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 2.5,
            color: '#b9c5ff',
            animation: 'tkjRise 0.6s ease-out both',
          }}
        >
          <span
            data-anim
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              background: 'rgb(43,255,136)',
              clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
              animation: 'tkjPulse 1.8s ease-in-out infinite',
              boxShadow: '0 0 10px rgba(43,255,136,0.8)',
            }}
          />
          SISTEM PEMINJAMAN MODERN TKJ
        </div>

        {/* Title */}
        <h1
          data-anim
          style={{
            position: 'relative',
            margin: 0,
            maxWidth: 820,
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 900,
            fontSize: 'clamp(38px, 8vw, 78px)',
            lineHeight: 1.08,
            letterSpacing: 1,
            color: '#f0f8fc',
            textTransform: 'uppercase',
            animation: 'tkjRise 0.6s ease-out 0.12s both',
          }}
        >
          wellcome to&nbsp;
          <span
            style={{
              position: 'relative',
              display: 'inline-block',
              marginLeft: 6,
              padding: '2px 18px 6px',
              color: 'rgb(4,7,12)',
              background: 'linear-gradient(135deg, rgb(92,132,255), rgb(168,85,247))',
              clipPath: 'polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%)',
              overflow: 'hidden',
              verticalAlign: 'baseline',
            }}
          >
            TKJ
            <span
              data-anim
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '40%',
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                animation: 'tkjShimmer 3.2s ease-in-out 1s infinite',
              }}
            />
          </span>
        </h1>

        {/* CTA */}
        <div
          data-anim
          style={{
            position: 'relative',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            marginTop: 40,
            animation: 'tkjRise 0.6s ease-out 0.32s both',
          }}
        >
          <Link
            href="/login"
            className="tkj-cta"
            style={{
              position: 'relative',
              display: 'inline-block',
              padding: '15px 36px',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 2,
              color: '#04070c',
              textDecoration: 'none',
              background: 'linear-gradient(135deg, #5c84ff, #a855f7)',
              clipPath:
                'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
              boxShadow: '0 0 28px rgba(92,132,255,0.35)',
              overflow: 'hidden',
            }}
          >
            MASUK KE DASHBROAD
            <span
              data-anim
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '36%',
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                animation: 'tkjShimmer 2.8s ease-in-out infinite',
              }}
            />
          </Link>
          <Link
            href="/register"
            className="tkj-cta2"
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 2,
              color: '#5c84ff',
              textDecoration: 'none',
              background: 'rgba(92,132,255,0.04)',
              border: '1px solid rgba(92,132,255,0.45)',
              clipPath:
                'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
            }}
          >
            BUAT AKUN
          </Link>
        </div>

        {/* corner brackets */}
        <div data-anim style={{ position: 'absolute', left: 18, top: 18, width: 34, height: 34, borderLeft: '2px solid rgba(92,132,255,0.4)', borderTop: '2px solid rgba(92,132,255,0.4)', animation: 'tkjBlink 4s ease-in-out infinite' }} />
        <div data-anim style={{ position: 'absolute', right: 18, top: 18, width: 34, height: 34, borderRight: '2px solid rgba(92,132,255,0.4)', borderTop: '2px solid rgba(92,132,255,0.4)', animation: 'tkjBlink 4s ease-in-out 0.5s infinite' }} />
        <div data-anim style={{ position: 'absolute', left: 18, bottom: 18, width: 34, height: 34, borderLeft: '2px solid rgba(92,132,255,0.4)', borderBottom: '2px solid rgba(92,132,255,0.4)', animation: 'tkjBlink 4s ease-in-out 1s infinite' }} />
        <div data-anim style={{ position: 'absolute', right: 18, bottom: 18, width: 34, height: 34, borderRight: '2px solid rgba(92,132,255,0.4)', borderBottom: '2px solid rgba(92,132,255,0.4)', animation: 'tkjBlink 4s ease-in-out 1.5s infinite' }} />
      </section>

      {/* ===== STATS ===== */}
      <section
        style={{
          borderTop: '1px solid rgba(92,132,255,0.15)',
          borderBottom: '1px solid rgba(92,132,255,0.15)',
          background: 'linear-gradient(180deg, rgba(92,132,255,0.03), transparent)',
          padding: '34px 20px',
        }}
      >
        <div
          style={{
            margin: '0 auto',
            maxWidth: 960,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '14px 8px',
                background: 'rgba(232,242,247,0.025)',
                clipPath:
                  'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                borderTop: `2px solid rgba(${s.rgb},0.55)`,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 'clamp(18px, 3.4vw, 30px)',
                  fontWeight: 800,
                  color: s.hex,
                  textShadow: `0 0 16px rgba(${s.rgb},0.4)`,
                }}
              >
                {s.value}
              </p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: 1.5, color: '#7d93a0' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== ATURAN PEMINJAMAN ALAT ===== */}
      <section style={{ margin: '0 auto', maxWidth: 1040, padding: '76px 20px 84px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            marginBottom: 46,
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 2, background: 'linear-gradient(90deg, transparent, #5c84ff)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 4, color: '#5c84ff' }}>
              PROTOKOL PEMINJAMAN
            </span>
            <div style={{ width: 40, height: 2, background: 'linear-gradient(90deg, #5c84ff, transparent)' }} />
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 'clamp(24px, 4.6vw, 38px)',
              fontWeight: 800,
              letterSpacing: 1,
              color: '#f0f8fc',
              textTransform: 'uppercase',
            }}
          >
            Aturan Peminjaman Alat
          </h2>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 500, color: '#9fb6c2' }}>
            Ikuti protokol berikut sebelum meminjam peralatan lab TKJ
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {rules.map((r) => (
            <div
              key={r.n}
              className="tkj-card"
              style={
                {
                  position: 'relative',
                  padding: '24px 22px',
                  background: 'linear-gradient(160deg, rgba(232,242,247,0.04), rgba(232,242,247,0.01))',
                  border: `1px solid rgba(${r.rgb},0.16)`,
                  clipPath:
                    'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
                  ['--hc' as string]: `rgba(${r.rgb},0.6)`,
                } as React.CSSProperties
              }
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 46,
                  height: 46,
                  marginBottom: 16,
                  background: `rgba(${r.rgb},0.12)`,
                  clipPath: 'polygon(50% 0, 100% 28%, 100% 72%, 50% 100%, 0 72%, 0 28%)',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 17,
                    fontWeight: 900,
                    color: r.hex,
                    textShadow: `0 0 12px rgba(${r.rgb},0.5)`,
                  }}
                >
                  {r.n}
                </span>
              </div>
              <h3
                style={{
                  margin: '0 0 8px',
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: '#f0f8fc',
                }}
              >
                {r.title}
              </h3>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500, lineHeight: 1.6, color: '#9fb6c2' }}>
                {r.desc}
              </p>
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  width: 28,
                  height: 28,
                  background: `linear-gradient(225deg, rgba(${r.rgb},0.4), transparent 60%)`,
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ borderTop: '1px solid rgba(92,132,255,0.15)', padding: '26px 20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div
            style={{
              width: 14,
              height: 14,
              background: 'rgba(92,132,255,0.5)',
              clipPath: 'polygon(50% 0, 100% 28%, 100% 72%, 50% 100%, 0 72%, 0 28%)',
            }}
          />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: 1.5, color: '#5d717d' }}>
            TKJ
          </p>
        </div>
      </footer>
    </div>
  )
}
