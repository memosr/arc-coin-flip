'use client'

import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { ERC20_ABI, USDC_ADDRESS, formatUsdc } from '@/lib/contracts'

export function WalletBar() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  const { data: userBalance } = useReadContract({
    abi: ERC20_ABI,
    address: USDC_ADDRESS,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  })

  return (
    <header
      className="sticky top-0 z-10 border-b border-white/[0.07] backdrop-blur-xl"
      style={{ background: 'rgba(10, 8, 30, 0.72)' }}
    >
      <div className="max-w-4xl mx-auto px-5 py-3.5 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🪙</span>
          <span
            className="font-semibold text-base bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #60a5fa, #22d3ee)' }}
          >
            CoinFlip
          </span>
          {/* Network badge */}
          <div
            className="ml-1 p-[1px] rounded-full"
            style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.5), rgba(96,165,250,0.5))' }}
          >
            <span className="block text-xs px-2.5 py-0.5 rounded-full font-medium text-purple-300/80"
              style={{ background: 'rgba(10,8,30,0.85)' }}>
              Arc Testnet
            </span>
          </div>
        </div>

        {/* Right side */}
        {!mounted ? (
          <div className="w-28 h-8 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        ) : isConnected && address ? (
          <div className="flex items-center gap-5">
            {userBalance !== undefined && (
              <div className="text-right hidden sm:block">
                <div className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Balance</div>
                <div
                  className="text-sm font-semibold font-mono bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(90deg, #34d399, #22d3ee)' }}
                >
                  {formatUsdc(userBalance)} USDC
                </div>
              </div>
            )}
            <div
              className="p-[1px] rounded-xl"
              style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.35), rgba(96,165,250,0.35))' }}
            >
              <button
                onClick={() => disconnect()}
                className="text-xs font-mono px-3.5 py-1.5 rounded-xl text-white/60 hover:text-white/90 transition-colors"
                style={{ background: 'rgba(10,8,30,0.85)' }}
              >
                {address.slice(0, 6)}…{address.slice(-4)}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="p-[1.5px] rounded-xl"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb, #0891b2)' }}
          >
            <button
              onClick={() => connect({ connector: injected() })}
              className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white hover:text-white transition-colors"
              style={{ background: 'rgba(10,8,30,0.7)' }}
            >
              Connect Wallet
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
