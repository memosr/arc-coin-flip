'use client'

import { useState } from 'react'
import { WalletBar } from '@/components/WalletBar'
import { CoinGame } from '@/components/CoinGame'
import { RecentFlips } from '@/components/RecentFlips'
import { Stats } from '@/components/Stats'
import { MyStats } from '@/components/MyStats'
import { GMRewardCard } from '@/components/GMRewardCard'

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <>
      {/* Radial purple glow at top */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 45% at 50% -5%, rgba(120,50,220,0.28) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />

      <div className="relative flex flex-col min-h-screen" style={{ zIndex: 1 }}>
        <WalletBar />

        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-10 flex flex-col gap-7">
          {/* Heading */}
          <div className="text-center anim-up">
            <h1 className="text-4xl font-bold tracking-tight">
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #a78bfa, #60a5fa, #22d3ee)',
                }}
              >
                CoinFlip
              </span>
            </h1>
            <p className="text-white/30 text-sm mt-2 font-light">
              Double or nothing — USDC on Arc Testnet
            </p>
          </div>

          <div className="anim-up-1">
            <GMRewardCard />
          </div>

          <div className="anim-up-1">
            <Stats refreshKey={refreshKey} />
          </div>

          <div className="anim-up-2">
            <MyStats refreshKey={refreshKey} />
          </div>

          <div className="anim-up-2">
            <CoinGame onFlipComplete={() => setRefreshKey((k) => k + 1)} />
          </div>

          <div className="anim-up-3">
            <RecentFlips refreshKey={refreshKey} />
          </div>
        </main>

        <footer className="relative text-center py-5 text-white/20 text-xs font-light">
          <span className="font-mono">0x7bc7…8576</span>
          <span className="mx-2 opacity-40">·</span>
          Arc Testnet
          <span className="mx-2 opacity-40">·</span>
          chainId 5042002
        </footer>
      </div>
    </>
  )
}
