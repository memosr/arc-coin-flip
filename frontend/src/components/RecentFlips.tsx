'use client'

import { useReadContract, useReadContracts } from 'wagmi'
import { COINFLIP_ADDRESS, COINFLIP_ABI, formatUsdc, shortAddress } from '@/lib/contracts'

export function RecentFlips({ refreshKey }: { refreshKey: number }) {
  const { data: flipCount } = useReadContract({
    abi: COINFLIP_ABI,
    address: COINFLIP_ADDRESS,
    functionName: 'getFlipCount',
    query: { refetchInterval: 8000 },
  })

  const count = Number(flipCount ?? 0n)
  const toFetch = Math.min(10, count)
  const indices = Array.from({ length: toFetch }, (_, i) => BigInt(count - 1 - i))

  const { data: flipsRaw } = useReadContracts({
    contracts: indices.map((i) => ({
      abi: COINFLIP_ABI,
      address: COINFLIP_ADDRESS,
      functionName: 'flips' as const,
      args: [i] as const,
    })),
    query: { enabled: toFetch > 0, refetchInterval: 8000 },
  })

  const flips = (flipsRaw ?? []).flatMap((f, idx) => {
    if (f.status !== 'success' || !f.result) return []
    const [player, amount, choice, result] = f.result as [string, bigint, number, number, bigint]
    return [{ index: count - 1 - idx, player, amount, choice: choice as 0 | 1, result: result as 0 | 1 }]
  })

  if (count === 0) return null

  return (
    <div
      className="rounded-3xl p-5 border border-white/[0.07] backdrop-blur-xl"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
          Recent Flips
        </span>
        <span className="text-[10px] font-mono text-white/20">{count} total</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[2rem_1fr_auto_2rem_2rem_3.5rem] gap-2 px-3 mb-1">
        {['#', 'Player', 'Amount', '', '', ''].map((h, i) => (
          <div key={i} className={`text-[9px] uppercase tracking-widest text-white/20 ${i >= 3 ? 'text-center' : ''}`}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-1">
        {flips.map((flip) => {
          const won = flip.choice === flip.result
          return (
            <div
              key={flip.index}
              className="grid grid-cols-[2rem_1fr_auto_2rem_2rem_3.5rem] gap-2 items-center px-3 py-2.5 rounded-xl transition-all duration-150 border border-transparent hover:border-white/[0.07]"
              style={{ background: 'rgba(255,255,255,0)', transition: 'background 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0)' }}
            >
              <span className="text-[11px] font-mono text-white/20">{flip.index}</span>
              <span className="flex items-center gap-1 min-w-0">
                <span className="text-xs font-mono text-white/50 truncate">{shortAddress(flip.player)}</span>
                <a
                  href={`https://testnet.arcscan.app/address/${flip.player}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[10px] text-white/20 hover:text-purple-400/70 transition-colors duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  ↗
                </a>
              </span>
              <span className="text-xs font-mono text-white/70">
                {formatUsdc(flip.amount)}
                <span className="text-white/25 ml-1 text-[10px]">USDC</span>
              </span>
              <span className="text-base text-center">{flip.choice === 0 ? '👑' : '🔥'}</span>
              <span className="text-base text-center">{flip.result === 0 ? '👑' : '🔥'}</span>
              <div className="flex justify-center">
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
                  style={won ? {
                    background: 'rgba(52,211,153,0.12)',
                    border: '1px solid rgba(52,211,153,0.25)',
                    color: '#6ee7b7',
                  } : {
                    background: 'rgba(244,63,94,0.10)',
                    border: '1px solid rgba(244,63,94,0.20)',
                    color: '#fda4af',
                  }}
                >
                  {won ? 'WIN' : 'LOSE'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
