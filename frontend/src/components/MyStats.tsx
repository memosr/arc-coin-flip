'use client'

import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { COINFLIP_ADDRESS, COINFLIP_ABI, formatUsdc } from '@/lib/contracts'

export function MyStats({ refreshKey: _refreshKey }: { refreshKey: number }) {
  const { address, isConnected } = useAccount()

  const { data: playerFlipIds } = useReadContract({
    abi: COINFLIP_ABI,
    address: COINFLIP_ADDRESS,
    functionName: 'getPlayerFlips',
    args: [address!],
    query: { enabled: isConnected && !!address, refetchInterval: 8000 },
  })

  const flipIds = playerFlipIds as bigint[] | undefined

  const { data: flipsRaw } = useReadContracts({
    contracts: (flipIds ?? []).map((id) => ({
      abi: COINFLIP_ABI,
      address: COINFLIP_ADDRESS,
      functionName: 'flips' as const,
      args: [id] as const,
    })),
    query: { enabled: !!flipIds && flipIds.length > 0, refetchInterval: 8000 },
  })

  if (!isConnected) {
    return (
      <div
        className="rounded-2xl p-5 border border-white/[0.07] backdrop-blur-xl text-center text-white/30 text-sm"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        <div className="text-[10px] uppercase tracking-widest text-white/20 font-medium mb-2">
          📊 My Stats
        </div>
        Connect wallet to see your stats
      </div>
    )
  }

  const totalFlips = flipIds?.length ?? 0
  const flipsReady = totalFlips === 0 || (flipsRaw !== undefined && flipsRaw.length === totalFlips)

  if (flipIds !== undefined && totalFlips === 0) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/20 font-medium mb-2 ml-0.5">
          📊 My Stats
        </div>
        <div
          className="rounded-2xl p-5 border border-white/[0.07] backdrop-blur-xl text-center text-white/30 text-sm"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          🎲 No flips yet — try your luck!
        </div>
      </div>
    )
  }

  let wins = 0
  let losses = 0
  let totalVolume = 0n
  let netProfit = 0n

  for (const f of flipsRaw ?? []) {
    if (f.status !== 'success' || !f.result) continue
    const [, amount, , result] = f.result as [string, bigint, number, number, bigint]
    totalVolume += amount
    if (result === 1) {
      wins++
      netProfit += amount
    } else if (result === 2) {
      losses++
      netProfit -= amount
    }
  }

  const winRate = flipsReady && totalFlips > 0 ? ((wins / totalFlips) * 100).toFixed(1) + '%' : '—'
  const volumeDisplay = flipsReady ? formatUsdc(totalVolume) + ' USDC' : '—'
  const netAbs = netProfit < 0n ? -netProfit : netProfit
  const netSign = netProfit >= 0n ? '+' : '-'
  const netDisplay = flipsReady ? netSign + formatUsdc(netAbs) + ' USDC' : '—'
  const netGradient =
    netProfit >= 0n
      ? 'linear-gradient(135deg, #34d399, #22d3ee)'
      : 'linear-gradient(135deg, #f87171, #fb923c)'

  const cards = [
    {
      label: 'My Flips',
      value: flipIds ? totalFlips.toLocaleString() : '—',
      gradient: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
    },
    {
      label: 'W / L',
      value: flipsReady ? `${wins} / ${losses}` : '—',
      gradient: 'linear-gradient(135deg, #34d399, #f87171)',
    },
    {
      label: 'Win Rate',
      value: winRate,
      gradient: 'linear-gradient(135deg, #fbbf24, #a78bfa)',
    },
    {
      label: 'Volume',
      value: volumeDisplay,
      gradient: 'linear-gradient(135deg, #a78bfa, #60a5fa, #22d3ee)',
    },
    {
      label: 'Net P&L',
      value: netDisplay,
      gradient: netGradient,
    },
  ]

  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/20 font-medium mb-2 ml-0.5">
        📊 My Stats
      </div>
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
    </div>
  )
}
