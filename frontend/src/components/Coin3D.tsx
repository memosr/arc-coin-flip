'use client'

interface Coin3DProps {
  isFlipping: boolean
  result: 0 | 1 | null // 0=Heads 1=Tails
}

export function Coin3D({ isFlipping, result }: Coin3DProps) {
  const restAngle = result === 1 ? 180 : 0

  return (
    <div className="flex justify-center items-center my-6" style={{ perspective: '700px' }}>
      {/* Glow wrapper — pulses while spinning */}
      <div className={isFlipping ? 'coin-glow' : ''}>
        <div
          className="relative w-36 h-36"
          style={{
            transformStyle: 'preserve-3d',
            animation: isFlipping ? 'coinSpin 3s ease-in-out forwards' : undefined,
            transform: !isFlipping ? `rotateY(${restAngle}deg)` : undefined,
            transition: !isFlipping ? 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
          }}
        >
          {/* Heads face — front */}
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center text-5xl"
            style={{
              backfaceVisibility: 'hidden',
              background: 'radial-gradient(circle at 32% 32%, #fef3c7, #d97706)',
              boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.35), inset 0 -4px 8px rgba(0,0,0,0.25), 0 4px 20px rgba(217,119,6,0.4)',
              border: '3px solid rgba(251,191,36,0.6)',
            }}
          >
            👑
          </div>

          {/* Tails face — back */}
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center text-5xl"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'radial-gradient(circle at 32% 32%, #fed7aa, #c2410c)',
              boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.3), inset 0 -4px 8px rgba(0,0,0,0.25), 0 4px 20px rgba(194,65,12,0.4)',
              border: '3px solid rgba(251,146,60,0.6)',
            }}
          >
            🔥
          </div>
        </div>
      </div>
    </div>
  )
}
