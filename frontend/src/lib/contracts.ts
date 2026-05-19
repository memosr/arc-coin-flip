export const COINFLIP_ADDRESS = '0x7bc7dD809562DB33A1C754422AB07B78EC9a8576' as const
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const

export const COINFLIP_ABI = [
  {
    name: 'flip',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'side', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'getFlipCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'flips',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'player', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'choice', type: 'uint8' },
      { name: 'result', type: 'uint8' },
      { name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    name: 'totalWins',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalLosses',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'houseBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getPlayerFlips',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ type: 'uint256[]' }],
  },
  {
    name: 'FlipResult',
    type: 'event',
    inputs: [
      { name: 'flipId', type: 'uint256', indexed: true },
      { name: 'player', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'choice', type: 'uint8', indexed: false },
      { name: 'outcome', type: 'uint8', indexed: false },
      { name: 'result', type: 'uint8', indexed: false },
    ],
  },
] as const

export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const

export function formatUsdc(raw: bigint): string {
  const whole = raw / 1_000_000n
  const frac = raw % 1_000_000n
  if (frac === 0n) return whole.toString()
  return `${whole}.${frac.toString().padStart(6, '0').replace(/0+$/, '')}`
}

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}
