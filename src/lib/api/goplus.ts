// GoPlus Security API - Free, no auth required
// Docs: https://docs.gopluslabs.io/
// SolanaFM API - Free, no auth required
// Docs: https://docs.solana.fm/

import {
  detectERCStandard,
  getERCStandardRiskFactors,
  getERCStandardScoreModifier,
  supportsERCDetection,
  type ERCStandardResult
} from './ercStandards';

// Re-export ERC standard types for convenience
export type { ERCStandardResult } from './ercStandards';
export { detectERCStandard, supportsERCDetection } from './ercStandards';

export interface GoPlusSecurityResult {
  isHoneypot: boolean;
  isOpenSource: boolean;
  isProxy: boolean;
  isMintable: boolean;
  canTakeBackOwnership: boolean;
  ownerChangeBalance: boolean;
  hiddenOwner: boolean;
  selfDestruct: boolean;
  externalCall: boolean;
  buyTax: string;
  sellTax: string;
  holderCount: string;
  lpHolderCount: string;
  totalSupply: string;
  creatorAddress: string;
  creatorPercent: string;
  lpTotalSupplyPercent: string;
  isAntiWhale: boolean;
  isBlacklisted: boolean;