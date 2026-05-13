'use client'

import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { readContract, waitForTransactionReceipt } from '@wagmi/core'
import { decodeEventLog } from 'viem'
import { wagmiConfig } from '@/lib/wagmi'
import {
  COINFLIP_ADDRESS,
  USDC_ADDRESS,
  COINFLIP_ABI,
  ERC20_ABI,
  formatUsdc,
} from '@/lib/contracts'
import { Coin3D } from './Coin3D'

type GamePhase = 'idle' | 'approving' | 'flipping' | 'result' | 'error'

interface FlipResult {
  won: boolean
  outcome: 0 | 1
  amount: bigint
}

// Gradient border wrapper for HEADS / TAILS buttons
function SideButton({
  emoji,
  label,
  selected,
  gradient,
  selectedGlow,
  onClick,
  disabled,
}: {
  emoji: string
  label: string
  selected: boolean
  gradient: string
  selectedGlow: string
  onClick: () => void
  disabled: boolean
}) {
  return (
    <div
      className="flex-1 p-[1.5px] rounded-2xl transition-all duration-200"
      style={{
        background: selected
          ? gradient
          : gradient.replace(/[\d.]+(?=\))/g, (m) => String(parseFloat(m) * 0.35)),
        boxShadow: selected ? selectedGlow : 'none',
      }}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full rounded-2xl py-5 text-2xl font-semibold tracking-wide transition-all duration-200 ${
          selected ? 'text-white' : 'text-white/40 hover:text-white/70'
        }`}
        style={{
          background: selected ? 'rgba(255,255,255,0.07)' : 'rgba(10,8,30,0.80)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {emoji} {label}
      </button>
    </div>
  )
}

export function CoinGame({ onFlipComplete }: { onFlipComplete: () => void }) {
  const { address, isConnected } = useAccount()
  const [selectedSide, setSelectedSide] = useState<0 | 1 | null>(null)
  const [betAmount, setBetAmount] = useState('1')
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [flipResult, setFlipResult] = useState<FlipResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [coinFlipping, setCoinFlipping] = useState(false)
  const [coinResult, setCoinResult] = useState<0 | 1 | null>(null)

  const { writeContractAsync } = useWriteContract()

  const { data: houseBalance, refetch: refetchHouse } = useReadContract({
    abi: COINFLIP_ABI,
    address: COINFLIP_ADDRESS,
    functionName: 'houseBalance',
    query: { refetchInterval: 8000 },
  })

  async function handleFlip() {
    if (!address || selectedSide === null) return
    const bet = parseFloat(betAmount)
    if (isNaN(bet) || bet < 0.1 || bet > 10) return
    const amountMicro = BigInt(Math.round(bet * 1_000_000))

    try {
      setPhase('approving')
      setErrorMsg('')

      const allowance = await readContract(wagmiConfig, {
        abi: ERC20_ABI,
        address: USDC_ADDRESS,
        functionName: 'allowance',
        args: [address, COINFLIP_ADDRESS],
      })

      if (allowance < amountMicro) {
        const approveTx = await writeContractAsync({
          abi: ERC20_ABI,
          address: USDC_ADDRESS,
          functionName: 'approve',
          args: [COINFLIP_ADDRESS, amountMicro],
        })
        await waitForTransactionReceipt(wagmiConfig, { hash: approveTx })
      }

      setPhase('flipping')
      setCoinFlipping(true)
      setCoinResult(null)
      const animationDone = new Promise<void>((r) => setTimeout(r, 3000))

      const flipTx = await writeContractAsync({
        abi: COINFLIP_ABI,
        address: COINFLIP_ADDRESS,
        functionName: 'flip',
        args: [selectedSide, amountMicro],
      })

      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: flipTx })

      let result: FlipResult | null = null
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== COINFLIP_ADDRESS.toLowerCase()) continue
        try {
          const decoded = decodeEventLog({ abi: COINFLIP_ABI, data: log.data, topics: log.topics })
          if (decoded.eventName === 'FlipResult') {
            const args = decoded.args as { amount: bigint; choice: number; outcome: number; result: number }
            result = { won: args.result === 1, outcome: args.outcome as 0 | 1, amount: args.amount }
          }
        } catch { /* not a FlipResult */ }
      }

      await animationDone
      setCoinFlipping(false)

      if (result) {
        setCoinResult(result.outcome)
        setFlipResult(result)
      } else {
        setCoinResult(selectedSide)
        setFlipResult({ won: false, outcome: selectedSide, amount: amountMicro })
      }
      setPhase('result')
      refetchHouse()
      onFlipComplete()
    } catch (err: unknown) {
      setCoinFlipping(false)
      setPhase('error')
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg.includes('User rejected') ? 'Transaction rejected.' : msg.slice(0, 120))
    }
  }

  function reset() {
    setPhase('idle')
    setFlipResult(null)
    setCoinResult(null)
    setCoinFlipping(false)
  }

  const canFlip =
    isConnected &&
    selectedSide !== null &&
    parseFloat(betAmount) >= 0.1 &&
    parseFloat(betAmount) <= 10 &&
    phase === 'idle'

  const inputDisabled = phase !== 'idle' && phase !== 'result' && phase !== 'error'

  return (
    <div
      className="rounded-3xl p-6 border border-white/[0.08] shadow-2xl backdrop-blur-xl"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      {/* House balance */}
      {houseBalance !== undefined && (
        <div className="text-center mb-1">
          <div className="text-[10px] uppercase tracking-widest text-white/25 mb-0.5">House Balance</div>
          <div
            className="text-2xl font-bold font-mono bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(90deg, #a78bfa, #60a5fa)' }}
          >
            {formatUsdc(houseBalance)} USDC
          </div>
        </div>
      )}

      {/* 3D Coin */}
      <Coin3D isFlipping={coinFlipping} result={coinResult} />

      {/* Result banner */}
      {phase === 'result' && flipResult && (
        <div
          className="rounded-2xl p-4 mb-5 text-center text-lg font-semibold border"
          style={flipResult.won ? {
            background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(6,182,212,0.18))',
            borderColor: 'rgba(52,211,153,0.3)',
            color: '#6ee7b7',
            boxShadow: '0 0 30px rgba(16,185,129,0.15)',
          } : {
            background: 'linear-gradient(135deg, rgba(244,63,94,0.14), rgba(139,92,246,0.14))',
            borderColor: 'rgba(244,63,94,0.2)',
            color: '#fda4af',
            boxShadow: '0 0 20px rgba(244,63,94,0.10)',
          }}
        >
          {flipResult.won
            ? `🎉 🎊 You won ${formatUsdc(flipResult.amount * 2n)} USDC! 🎊 🎉`
            : `😔 You lost ${formatUsdc(flipResult.amount)} USDC`}
        </div>
      )}

      {/* Error banner */}
      {phase === 'error' && (
        <div
          className="rounded-2xl p-3.5 mb-5 text-center text-sm border"
          style={{
            background: 'rgba(244,63,94,0.10)',
            borderColor: 'rgba(244,63,94,0.25)',
            color: '#fda4af',
          }}
        >
          {errorMsg || 'Something went wrong.'}
        </div>
      )}

      {/* Side selection */}
      <div className="flex gap-3 mb-5">
        <SideButton
          emoji="👑" label="HEADS"
          selected={selectedSide === 0}
          gradient="linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b)"
          selectedGlow="0 0 24px rgba(245,158,11,0.45), 0 0 48px rgba(245,158,11,0.18)"
          onClick={() => setSelectedSide(selectedSide !== 0 ? 0 : null)}
          disabled={inputDisabled}
        />
        <SideButton
          emoji="🔥" label="TAILS"
          selected={selectedSide === 1}
          gradient="linear-gradient(135deg, #ef4444, #f97316, #ef4444)"
          selectedGlow="0 0 24px rgba(239,68,68,0.45), 0 0 48px rgba(249,115,22,0.18)"
          onClick={() => setSelectedSide(selectedSide !== 1 ? 1 : null)}
          disabled={inputDisabled}
        />
      </div>

      {/* Bet amount */}
      <div className="mb-5">
        <label className="block text-[10px] uppercase tracking-widest text-white/30 mb-2">
          Bet Amount (USDC)
        </label>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 p-[1px] rounded-xl"
            style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(96,165,250,0.2))' }}
          >
            <input
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              disabled={inputDisabled}
              className="w-full rounded-xl px-3 py-2.5 font-mono text-lg text-white/90 focus:outline-none"
              style={{ background: 'rgba(10,8,30,0.80)' }}
            />
          </div>
          <div className="flex gap-1.5">
            {['0.5', '1', '5', '10'].map((v) => (
              <button
                key={v}
                onClick={() => setBetAmount(v)}
                disabled={inputDisabled}
                className="text-xs font-mono px-2.5 py-2 rounded-lg text-white/40 hover:text-white/80 transition-colors border border-white/[0.07] hover:border-white/20"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Flip / action button */}
      {phase === 'result' || phase === 'error' ? (
        <button
          onClick={reset}
          className="w-full py-4 rounded-2xl font-semibold text-base text-white/60 hover:text-white/90 border border-white/[0.08] transition-all hover:border-white/20"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          Play Again
        </button>
      ) : (
        <button
          onClick={handleFlip}
          disabled={!canFlip}
          className={`w-full py-4 rounded-2xl font-semibold text-base tracking-wide transition-all ${
            canFlip ? 'btn-flip text-white hover:scale-[1.015]' : 'text-white/25 cursor-not-allowed'
          }`}
          style={!canFlip ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' } : {}}
        >
          {phase === 'approving' && '⏳  Approving USDC…'}
          {phase === 'flipping' && '🪙  Flipping…'}
          {phase === 'idle' && (
            isConnected
              ? selectedSide === null ? 'Select HEADS or TAILS' : '🎲  Flip Coin'
              : 'Connect Wallet to Play'
          )}
        </button>
      )}
    </div>
  )
}
