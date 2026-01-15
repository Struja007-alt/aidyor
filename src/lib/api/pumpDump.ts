// Pump & Dump Detection API
// Analyzes price movements, volume anomalies, and trading patterns

import { DexPair } from "./dexscreener";

export type PumpDumpStatus = 'normal' | 'pump' | 'dump' | 'pump_warning' | 'dump_warning';

export interface PumpDumpAnalysis {
  status: PumpDumpStatus;
  confidence: number; // 0-100
  signals: PumpDumpSignal[];
  priceChange5m: number;
  priceChange1h: number;
  priceChange24h: number;
  volumeChange: number;
  buySellRatio: number;
  alert?: string;
}

export interface PumpDumpSignal {
  name: string;
  type: 'pump' | 'dump' | 'neutral';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

// Thresholds for detection
const THRESHOLDS = {
  // Pump thresholds
  PUMP_5M_PRICE: 15,        // 15% in 5 minutes
  PUMP_1H_PRICE: 50,        // 50% in 1 hour
  PUMP_24H_PRICE: 200,      // 200% in 24 hours
  PUMP_VOLUME_SPIKE: 5,     // 5x normal volume
  PUMP_BUY_RATIO: 3,        // 3:1 buy to sell ratio
  
  // Dump thresholds
  DUMP_5M_PRICE: -10,       // -10% in 5 minutes
  DUMP_1H_PRICE: -30,       // -30% in 1 hour
  DUMP_24H_PRICE: -50,      // -50% in 24 hours
  DUMP_SELL_RATIO: 0.3,     // 1:3 buy to sell ratio
  
  // Warning thresholds (softer)
  WARNING_5M_PRICE: 8,
  WARNING_1H_PRICE: 30,
  WARNING_VOLUME_SPIKE: 3,
};

// Analyze a token for pump/dump patterns
export function analyzePumpDump(pairs: DexPair[]): PumpDumpAnalysis {
  if (!pairs || pairs.length === 0) {
    return getDefaultAnalysis();
  }

  // Get the main pair (highest liquidity)
  const mainPair = pairs.reduce((best, pair) => 
    (pair.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? pair : best
  , pairs[0]);

  const signals: PumpDumpSignal[] = [];
  let pumpScore = 0;
  let dumpScore = 0;

  // Price changes
  const priceChange5m = mainPair.priceChange?.m5 || 0;
  const priceChange1h = mainPair.priceChange?.h1 || 0;
  const priceChange24h = mainPair.priceChange?.h24 || 0;

  // Volume analysis
  const volume5m = mainPair.volume?.m5 || 0;
  const volume1h = mainPair.volume?.h1 || 0;
  const volume24h = mainPair.volume?.h24 || 0;
  
  // Calculate expected hourly volume from 24h
  const expectedHourlyVolume = volume24h / 24;
  const volumeChange = expectedHourlyVolume > 0 ? volume1h / expectedHourlyVolume : 0;

  // Buy/Sell analysis
  const buys24h = mainPair.txns?.h24?.buys || 0;
  const sells24h = mainPair.txns?.h24?.sells || 0;
  const buys1h = mainPair.txns?.h1?.buys || 0;
  const sells1h = mainPair.txns?.h1?.sells || 0;
  const buySellRatio = sells24h > 0 ? buys24h / sells24h : buys24h > 0 ? 10 : 1;
  const buySellRatio1h = sells1h > 0 ? buys1h / sells1h : buys1h > 0 ? 10 : 1;

  // === PUMP DETECTION ===
  
  // 5-minute pump
  if (priceChange5m >= THRESHOLDS.PUMP_5M_PRICE) {
    signals.push({
      name: '5m Price Spike',
      type: 'pump',
      severity: 'high',
      description: `+${priceChange5m.toFixed(1)}% in 5 minutes - Extreme pump!`,
    });
    pumpScore += 40;
  } else if (priceChange5m >= THRESHOLDS.WARNING_5M_PRICE) {
    signals.push({
      name: '5m Price Rise',
      type: 'pump',
      severity: 'medium',
      description: `+${priceChange5m.toFixed(1)}% in 5 minutes`,
    });
    pumpScore += 20;
  }

  // 1-hour pump
  if (priceChange1h >= THRESHOLDS.PUMP_1H_PRICE) {
    signals.push({
      name: '1h Price Surge',
      type: 'pump',
      severity: 'high',
      description: `+${priceChange1h.toFixed(1)}% in 1 hour - Major pump!`,
    });
    pumpScore += 35;
  } else if (priceChange1h >= THRESHOLDS.WARNING_1H_PRICE) {
    signals.push({
      name: '1h Price Rise',
      type: 'pump',
      severity: 'medium',
      description: `+${priceChange1h.toFixed(1)}% in 1 hour`,
    });
    pumpScore += 15;
  }

  // Volume spike
  if (volumeChange >= THRESHOLDS.PUMP_VOLUME_SPIKE) {
    signals.push({
      name: 'Volume Explosion',
      type: 'pump',
      severity: 'high',
      description: `${volumeChange.toFixed(1)}x normal hourly volume`,
    });
    pumpScore += 25;
  } else if (volumeChange >= THRESHOLDS.WARNING_VOLUME_SPIKE) {
    signals.push({
      name: 'Volume Spike',
      type: 'pump',
      severity: 'medium',
      description: `${volumeChange.toFixed(1)}x normal hourly volume`,
    });
    pumpScore += 10;
  }

  // Buy pressure
  if (buySellRatio1h >= THRESHOLDS.PUMP_BUY_RATIO) {
    signals.push({
      name: 'Extreme Buy Pressure',
      type: 'pump',
      severity: 'high',
      description: `${buySellRatio1h.toFixed(1)}:1 buy/sell ratio in 1h`,
    });
    pumpScore += 20;
  }

  // === DUMP DETECTION ===

  // 5-minute dump
  if (priceChange5m <= THRESHOLDS.DUMP_5M_PRICE) {
    signals.push({
      name: '5m Price Crash',
      type: 'dump',
      severity: 'high',
      description: `${priceChange5m.toFixed(1)}% in 5 minutes - Flash crash!`,
    });
    dumpScore += 40;
  }

  // 1-hour dump
  if (priceChange1h <= THRESHOLDS.DUMP_1H_PRICE) {
    signals.push({
      name: '1h Price Drop',
      type: 'dump',
      severity: 'high',
      description: `${priceChange1h.toFixed(1)}% in 1 hour - Major dump!`,
    });
    dumpScore += 35;
  } else if (priceChange1h <= -15) {
    signals.push({
      name: '1h Price Decline',
      type: 'dump',
      severity: 'medium',
      description: `${priceChange1h.toFixed(1)}% in 1 hour`,
    });
    dumpScore += 15;
  }

  // 24-hour dump
  if (priceChange24h <= THRESHOLDS.DUMP_24H_PRICE) {
    signals.push({
      name: '24h Price Collapse',
      type: 'dump',
      severity: 'high',
      description: `${priceChange24h.toFixed(1)}% in 24 hours - Severe dump!`,
    });
    dumpScore += 30;
  }

  // Sell pressure
  if (buySellRatio1h <= THRESHOLDS.DUMP_SELL_RATIO) {
    signals.push({
      name: 'Extreme Sell Pressure',
      type: 'dump',
      severity: 'high',
      description: `Heavy selling: ${buySellRatio1h.toFixed(2)}:1 buy/sell ratio`,
    });
    dumpScore += 25;
  }

  // Post-pump dump detection (pump followed by immediate dump)
  if (priceChange24h > 100 && priceChange1h < -20) {
    signals.push({
      name: 'Post-Pump Dump',
      type: 'dump',
      severity: 'high',
      description: 'Classic pump & dump pattern detected!',
    });
    dumpScore += 40;
  }

  // Determine status
  let status: PumpDumpStatus = 'normal';
  let confidence = 0;
  let alert: string | undefined;

  if (pumpScore >= 50 || dumpScore >= 50) {
    if (pumpScore > dumpScore) {
      status = 'pump';
      confidence = Math.min(100, pumpScore);
      alert = '🚀 PUMP DETECTED - Exercise extreme caution!';
    } else {
      status = 'dump';
      confidence = Math.min(100, dumpScore);
      alert = '📉 DUMP DETECTED - Consider exiting position!';
    }
  } else if (pumpScore >= 25 || dumpScore >= 25) {
    if (pumpScore > dumpScore) {
      status = 'pump_warning';
      confidence = Math.min(100, pumpScore);
      alert = '⚠️ Pump signals detected - Monitor closely';
    } else {
      status = 'dump_warning';
      confidence = Math.min(100, dumpScore);
      alert = '⚠️ Dump signals detected - Monitor closely';
    }
  } else {
    // Add neutral signal if no alerts
    if (signals.length === 0) {
      signals.push({
        name: 'Normal Trading',
        type: 'neutral',
        severity: 'low',
        description: 'No unusual price or volume activity detected',
      });
    }
  }

  return {
    status,
    confidence,
    signals,
    priceChange5m,
    priceChange1h,
    priceChange24h,
    volumeChange,
    buySellRatio,
    alert,
  };
}

function getDefaultAnalysis(): PumpDumpAnalysis {
  return {
    status: 'normal',
    confidence: 0,
    signals: [],
    priceChange5m: 0,
    priceChange1h: 0,
    priceChange24h: 0,
    volumeChange: 0,
    buySellRatio: 1,
  };
}

// Get status color
export function getPumpDumpColor(status: PumpDumpStatus): string {
  switch (status) {
    case 'pump':
      return 'text-[#00ff88]'; // Bright green
    case 'pump_warning':
      return 'text-warning';
    case 'dump':
      return 'text-danger';
    case 'dump_warning':
      return 'text-warning';
    default:
      return 'text-muted-foreground';
  }
}

// Get status background
export function getPumpDumpBg(status: PumpDumpStatus): string {
  switch (status) {
    case 'pump':
      return 'bg-[#00ff88]/20 border-[#00ff88]/50';
    case 'pump_warning':
      return 'bg-warning/20 border-warning/50';
    case 'dump':
      return 'bg-danger/20 border-danger/50';
    case 'dump_warning':
      return 'bg-warning/20 border-warning/50';
    default:
      return 'bg-secondary/30 border-border/30';
  }
}

// Get status icon name
export function getPumpDumpIcon(status: PumpDumpStatus): 'rocket' | 'trending-down' | 'alert-triangle' | 'minus' {
  switch (status) {
    case 'pump':
    case 'pump_warning':
      return 'rocket';
    case 'dump':
    case 'dump_warning':
      return 'trending-down';
    default:
      return 'minus';
  }
}

// Get status label
export function getPumpDumpLabel(status: PumpDumpStatus): string {
  switch (status) {
    case 'pump':
      return 'PUMPING';
    case 'pump_warning':
      return 'PUMP ALERT';
    case 'dump':
      return 'DUMPING';
    case 'dump_warning':
      return 'DUMP ALERT';
    default:
      return 'STABLE';
  }
}
