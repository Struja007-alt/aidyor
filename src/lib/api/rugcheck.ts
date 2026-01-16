// RugCheck API - Free, no auth required
// Enhanced security analysis for Solana tokens
// Docs: https://docs.rugcheck.xyz/

export interface RugCheckResult {
  score: number; // 0-100, higher = safer
  risks: RugCheckRisk[];
  tokenMeta: {
    name: string;
    symbol: string;
    mintAuthority: string | null;
    freezeAuthority: string | null;
    supply: number;
    decimals: number;
  };
  topHolders: {
    address: string;
    pct: number;
    isInsider: boolean;
  }[];
  markets: {
    lp: string;
    liquidityA: number;
    liquidityB: number;
  }[];
}

export interface RugCheckRisk {
  name: string;
  value: string;
  description: string;
  score: number;
  level: 'info' | 'warn' | 'danger';
}

// Fetch Solana token security from RugCheck
export async function getRugCheckSecurity(mintAddress: string): Promise<RugCheckResult | null> {
  try {
    const response = await fetch(
      `https://api.rugcheck.xyz/v1/tokens/${mintAddress}/report`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (!data || data.error) return null;

    // Parse risks from report
    const risks: RugCheckRisk[] = [];
    
    // Parse risk entries from the report
    if (data.risks && Array.isArray(data.risks)) {
      for (const risk of data.risks) {
        risks.push({
          name: risk.name || 'Unknown Risk',
          value: risk.value || '',
          description: risk.description || '',
          score: risk.score || 0,
          level: risk.level === 'danger' ? 'danger' : risk.level === 'warn' ? 'warn' : 'info'
        });
      }
    }

    // Parse top holders
    const topHolders = (data.topHolders || []).slice(0, 10).map((h: any) => ({
      address: h.address || '',
      pct: h.pct || 0,
      isInsider: h.insider || false
    }));

    // Parse markets/liquidity pools
    const markets = (data.markets || []).map((m: any) => ({
      lp: m.lp || '',
      liquidityA: m.liquidityA || 0,
      liquidityB: m.liquidityB || 0
    }));

    return {
      score: data.score || 0,
      risks,
      tokenMeta: {
        name: data.tokenMeta?.name || '',
        symbol: data.tokenMeta?.symbol || '',
        mintAuthority: data.tokenMeta?.mintAuthority || null,
        freezeAuthority: data.tokenMeta?.freezeAuthority || null,
        supply: data.tokenMeta?.supply || 0,
        decimals: data.tokenMeta?.decimals || 9
      },
      topHolders,
      markets
    };
  } catch (error) {
    console.error('RugCheck API error:', error);
    return null;
  }
}

// Analyze RugCheck data for risk factors
export function analyzeRugCheckSecurity(data: RugCheckResult): {
  score: number;
  factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[];
} {
  const factors: { name: string; status: 'safe' | 'warning' | 'danger'; description: string }[] = [];
  let score = 0;

  // RugCheck score analysis (0-100, higher = safer)
  if (data.score >= 80) {
    factors.push({ name: 'RugCheck Score', status: 'safe', description: `Score: ${data.score}/100 - Low risk` });
    score += 20;
  } else if (data.score >= 50) {
    factors.push({ name: 'RugCheck Score', status: 'warning', description: `Score: ${data.score}/100 - Moderate risk` });
    score += 5;
  } else if (data.score > 0) {
    factors.push({ name: 'RugCheck Score', status: 'danger', description: `Score: ${data.score}/100 - High risk` });
    score -= 15;
  }

  // Mint Authority check
  if (data.tokenMeta.mintAuthority) {
    factors.push({ name: 'Mint Authority', status: 'warning', description: 'Mint authority active - tokens can be created' });
    score -= 5;
  } else {
    factors.push({ name: 'Mint Authority', status: 'safe', description: 'Mint disabled (fixed supply)' });
    score += 10;
  }

  // Freeze Authority check
  if (data.tokenMeta.freezeAuthority) {
    factors.push({ name: 'Freeze Authority', status: 'warning', description: 'Freeze authority active - tokens can be frozen' });
    score -= 5;
  } else {
    factors.push({ name: 'Freeze Authority', status: 'safe', description: 'No freeze authority' });
    score += 5;
  }

  // Top holder concentration
  const totalTopHolderPct = data.topHolders.reduce((sum, h) => sum + h.pct, 0);
  const insiderHolderPct = data.topHolders.filter(h => h.isInsider).reduce((sum, h) => sum + h.pct, 0);
  
  if (insiderHolderPct > 30) {
    factors.push({ name: 'Insider Holdings', status: 'danger', description: `${insiderHolderPct.toFixed(1)}% held by insiders` });
    score -= 15;
  } else if (insiderHolderPct > 15) {
    factors.push({ name: 'Insider Holdings', status: 'warning', description: `${insiderHolderPct.toFixed(1)}% held by insiders` });
    score -= 5;
  } else if (insiderHolderPct > 0) {
    factors.push({ name: 'Insider Holdings', status: 'safe', description: `Low insider holdings (${insiderHolderPct.toFixed(1)}%)` });
    score += 5;
  }

  if (totalTopHolderPct > 50) {
    factors.push({ name: 'Holder Concentration', status: 'danger', description: `Top 10 hold ${totalTopHolderPct.toFixed(1)}% - Very concentrated` });
    score -= 10;
  } else if (totalTopHolderPct > 30) {
    factors.push({ name: 'Holder Concentration', status: 'warning', description: `Top 10 hold ${totalTopHolderPct.toFixed(1)}%` });
    score -= 5;
  } else {
    factors.push({ name: 'Holder Concentration', status: 'safe', description: `Well distributed (top 10: ${totalTopHolderPct.toFixed(1)}%)` });
    score += 10;
  }

  // Liquidity check
  const totalLiquidity = data.markets.reduce((sum, m) => sum + m.liquidityA + m.liquidityB, 0);
  if (totalLiquidity > 100000) {
    factors.push({ name: 'Liquidity Depth', status: 'safe', description: `Strong liquidity: $${(totalLiquidity / 1000).toFixed(0)}K+` });
    score += 10;
  } else if (totalLiquidity > 10000) {
    factors.push({ name: 'Liquidity Depth', status: 'warning', description: `Moderate liquidity: $${(totalLiquidity / 1000).toFixed(1)}K` });
    score += 5;
  } else if (totalLiquidity > 0) {
    factors.push({ name: 'Liquidity Depth', status: 'danger', description: `Low liquidity: $${totalLiquidity.toFixed(0)}` });
    score -= 10;
  }

  // Process RugCheck-reported risks
  for (const risk of data.risks) {
    const status: 'safe' | 'warning' | 'danger' = 
      risk.level === 'danger' ? 'danger' : 
      risk.level === 'warn' ? 'warning' : 'safe';
    
    // Only add significant risks
    if (risk.level !== 'info') {
      factors.push({
        name: risk.name,
        status,
        description: risk.description || risk.value
      });
      
      if (risk.level === 'danger') {
        score -= 10;
      } else if (risk.level === 'warn') {
        score -= 5;
      }
    }
  }

  return { score, factors };
}
