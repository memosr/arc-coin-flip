'use client'

import { useReadContracts } from 'wagmi'
import { COINFLIP_ADDRESS, COINFLIP_ABI, formatUsdc } from '@/lib/contracts'

export function Stats({ refreshKey: _refreshKey }: { refreshKey: number }) {
  const { data: counters } = useReadContracts({
    contracts: [
      { abi: COINFLIP_ABI, address: COINFLIP_ADDRESS, functionName: 'getFlipCount' },
      { abi: COINFLIP_ABI, address: COINFLIP_ADDRESS, functionName: 'totalWins' },
      { abi: COINFLIP_ABI, address: COINFLIP_ADDRESS, functionName: 'totalLosses' },
    ],
    query: { refetchInterval: 8000 },
  })

  const ready = counters !== undefined
  const totalFlips = ready && counters[0].status === 'success' ? Number(counters[0].result as bigint) : 0
  const wins = ready && counters[1].status === 'success' ? Number(counters[1].result as bigint) : 0
  const losses = ready && counters[2].status === 'success' ? Number(counters[2].result as bigint) : 0
  const winRate = totalFlips > 0 ? ((wins / totalFlips) * 100).toFixed(1) + '%' : '—'

  const indices = Array.from({ length: totalFlips }, (_, i) => BigInt(i))

  const { data: flipsRaw } = useReadContracts({
    contracts: indices.map((i) => ({
      abi: COINFLIP_ABI,
      address: COINFLIP_ADDRESS,
      functionName: 'flips' as const,
      args: [i] as const,
    })),
    query: { enabled: totalFlips > 0, refetchInterval: 8000 },
  })

  const totalVolume = (flipsRaw ?? []).reduce((acc, f) => {
    if (f.status !== 'success' || !f.result) return acc
    const [, amount] = f.result as [string, bigint, number, number, bigint]
    return acc + amount
  }, 0n)

  const volumeReady = totalFlips === 0 || (flipsRaw !== undefined && flipsRaw.length === totalFlips)
  const volumeDisplay = volumeReady
    ? totalFlips > 0 ? formatUsdc(totalVolume) + ' USDC' : '0 USDC'
    : '—'

  const cards = [
    {
      label: 'Total Flips',
      value: ready ? totalFlips.toLocaleString() : '—',
      gradient: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
    },
    {
      label: 'Total Wins',
      value: ready ? wins.toLocaleString() : '—',
      gradient: 'linear-gradient(135deg, #34d399, #22d3ee)',
    },
    {
      label: 'Total Losses',
      value: ready ? losses.toLocaleString() : '—',
      gradient: 'linear-gradient(135deg, #f87171, #fb923c)',
    },
    {
      label: 'Win Rate',
      value: ready ? winRate : '—',
      gradient: 'linear-gradient(135deg, #fbbf24, #a78bfa)',
    },
    {
      label: 'Volume',
      value: volumeDisplay,
      gradient: 'linear-gradient(135deg, #a78bfa, #60a5fa, #22d3ee)',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
      {cards.map(({ label, value, gradient }) => (
        <div
          key={label}
          className="rounded-2xl p-4 border border-white/[0.07] backdrop-blur-xl flex flex-col gap-1.5"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <span className="text-[9px] uppercase tracking-widest text-white/30 font-medium">
            {label}
          </span>
          <span
            className="text-xl font-bold font-mono bg-clip-text text-transparent leading-tight"
            style={{ backgroundImage: gradient }}
          >
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}
