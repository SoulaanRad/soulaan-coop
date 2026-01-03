/**
 * Contract ABIs for blockchain interactions
 * Only includes the functions needed for the mobile app
 */

export const BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export const SOULAANI_COIN_ABI = [
  ...BALANCE_ABI,
  {
    name: 'isActiveMember',
    type: 'function',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    name: 'getVotingPower',
    type: 'function',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export const UNITY_COIN_ABI = [
  ...BALANCE_ABI,
] as const;
