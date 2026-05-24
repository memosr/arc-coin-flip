'use client'

import { useState } from 'react'
import { useAccount, useReadContracts, useWriteContract } from 'wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import { wagmiConfig } from '@/lib/wagmi'
import { DAILY_GM_FAUCET_ADDRESS, DAILY_GM_ABI, formatUsdc } from '@/lib/contracts'

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${seconds}s`
}

export function GMRewardCard() {
  const { address, isConnected } = useAccount()
  const [pending, setPending] = useState(false)
  const [justClaimed, setJustClaimed] = useState(false)
  const [claimError, setClaimError] = useState('')

  const { data, refetch } = useReadContracts({
    contracts: [
      {
        abi: DAILY_GM_ABI,
        address: DAILY_GM_FAUCET_ADDRESS,
        functionName: 'poolBalance',
      },
      {
        abi: DAILY_GM_ABI,
        address: DAILY_GM_FAUCET_ADDRESS,
        functionName: 'claimsRemainingToday',
      },
      {
        abi: DAILY_GM_ABI,
        address: DAILY_GM_FAUCET_ADDRESS,
        functionName: 'canClaim',
        args: [address!],
      },
      {
        abi: DAILY_GM_ABI,
        address: DAILY_GM_FAUCET_ADDRESS,
        functionName: 'timeUntilNextClaim',
        args: [address!],
      },
    ],
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 30000,
    },
  })

  const { writeContractAsync } = useWriteContract()

  if (!isConnected || !address) return null

  const poolBalance =
    data?.[0].status === 'success' ? (data[0].result as bigint) : undefined
  const claimsRemaining =
    data?.[1].status === 'success' ? Number(data[1].result as bigint) : undefined
  const canClaimData =
    data?.[2].status === 'success'
      ? (data[2].result as readonly [boolean, string])
      : undefined
  const timeUntilNext =
    data?.[3].status === 'success' ? Number(data[3].result as bigint) : undefined

  const canClaim = canClaimData?.[0] ?? false
  const claimReason = canClaimData?.[1] ?? ''

  async function handleClaim() {
    if (!address || pending) return
    setPending(true)
    setClaimError('')
    try {
      const tx = await writeContractAsync({
        abi: DAILY_GM_ABI,
        address: DAILY_GM_FAUCET_ADDRESS,
        functionName: 'claim',
      })
      await waitForTransactionReceipt(wagmiConfig, { hash: tx })
      setJustClaimed(true)
      setTimeout(() => setJustClaimed(false), 4000)
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setClaimError(msg.includes('User rejected') ? 'Rejected.' : msg.slice(0, 80))
      setTimeout(() => setClaimError(''), 4000)
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="rounded-2xl border backdrop-blur-xl overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(249,115,22,0.04) 50%, rgba(251,191,36,0.03) 100%)',
        borderColor: 'rgba(251,191,36,0.18)',
        boxShadow: '0 0 32px rgba(251,191,36,0.06)',
      }}
    >
      {/* Sunrise accent bar */}
      <div
        className="h-[2px] w-full"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, #f59e0b 25%, #fbbf24 50%, #fb923c 75%, transparent 100%)',
        }}
      />

      <div className="px-5 py-4 flex items-center gap-4 flex-wrap sm:flex-nowrap">
        {/* Left: title + subtitle */}
        <div className="flex-shrink-0">
          <div
            className="text-[15px] font-bold bg-clip-text text-transparent leading-snug"
            style={{ backgroundImage: 'linear-gradient(135deg, #fbbf24, #fb923c)' }}
          >
            🌅 Daily GM Reward
          </div>
          <div className="text-[11px] text-white/35 mt-0.5 font-light">
            Claim 0.5 USDC every 24h
          </div>
        </div>

        {/* Middle: pool + claims remaining */}
        <div className="flex gap-5 flex-1 justify-center">
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-widest text-white/25 mb-0.5 font-medium">
              Pool Balance
            </div>
            <div
              className="text-sm font-semibold font-mono bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #fbbf24, #fb923c)' }}
            >
              {poolBalance !== undefined ? formatUsdc(poolBalance) + ' USDC' : '—'}
            </div>
          </div>
          <div
            className="w-px self-stretch"
            style={{ background: 'rgba(251,191,36,0.12)' }}
          />
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-widest text-white/25 mb-0.5 font-medium">
              Claims Left Today
            </div>
            <div
              className="text-sm font-semibold font-mono bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #fbbf24, #fb923c)' }}
            >
              {claimsRemaining !== undefined ? `${claimsRemaining}/10` : '—'}
            </div>
          </div>
        </div>

        {/* Right: action area */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1 min-w-[130px]">
          {claimError ? (
            <div
              className="px-3 py-2 rounded-xl text-[11px] text-center max-w-[140px]"
              style={{
                background: 'rgba(244,63,94,0.10)',
                color: '#fda4af',
                border: '1px solid rgba(244,63,94,0.2)',
              }}
            >
              {claimError}
            </div>
          ) : justClaimed ? (
            <div
              className="px-4 py-2 rounded-xl text-sm font-semibold text-center"
              style={{
                background:
                  'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(6,182,212,0.18))',
                color: '#6ee7b7',
                border: '1px solid rgba(52,211,153,0.28)',
                boxShadow: '0 0 20px rgba(52,211,153,0.12)',
              }}
            >
              ✅ 0.5 USDC claimed!
            </div>
          ) : canClaim ? (
            <button
              onClick={handleClaim}
              disabled={pending}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all whitespace-nowrap"
              style={{
                background: pending
                  ? 'rgba(251,191,36,0.15)'
                  : 'linear-gradient(135deg, #f59e0b, #fb923c)',
                boxShadow: pending ? 'none' : '0 0 22px rgba(245,158,11,0.38)',
                opacity: pending ? 0.65 : 1,
                cursor: pending ? 'not-allowed' : 'pointer',
              }}
            >
              {pending ? '⏳ Claiming…' : '☀️ Claim 0.5 USDC'}
            </button>
          ) : (
            <div className="text-right">
              {timeUntilNext !== undefined && timeUntilNext > 0 ? (
                <>
                  <div className="text-[9px] uppercase tracking-widest text-white/25 mb-0.5 font-medium">
                    Next claim in
                  </div>
                  <div
                    className="text-sm font-semibold font-mono bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(135deg, #fbbf24, #fb923c)' }}
                  >
                    {formatCountdown(timeUntilNext)}
                  </div>
                </>
              ) : claimReason ? (
                <div className="text-[11px] text-white/35 max-w-[130px] text-right leading-snug">
                  {claimReason}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
