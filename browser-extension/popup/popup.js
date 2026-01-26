// AIDYOR Browser Extension - Popup Script

const API_BASE = 'https://ckhagucgyjnpvcolcihc.supabase.co/functions/v1';

// DOM Elements
const addressInput = document.getElementById('addressInput');
const networkSelect = document.getElementById('networkSelect');
const scanBtn = document.getElementById('scanBtn');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const resultsSection = document.getElementById('resultsSection');
const emptyState = document.getElementById('emptyState');

// Result elements
const tokenImage = document.getElementById('tokenImage');
const tokenName = document.getElementById('tokenName');
const tokenSymbol = document.getElementById('tokenSymbol');
const tokenNetwork = document.getElementById('tokenNetwork');
const gaugeProgress = document.getElementById('gaugeProgress');
const scoreText = document.getElementById('scoreText');
const riskLevel = document.getElementById('riskLevel');
const honeypotStatus = document.getElementById('honeypotStatus');
const buyTax = document.getElementById('buyTax');
const sellTax = document.getElementById('sellTax');
const liquidity = document.getElementById('liquidity');
const riskFactorsList = document.getElementById('riskFactorsList');
const viewFullReport = document.getElementById('viewFullReport');
const copyResults = document.getElementById('copyResults');

let currentScanResult = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadLastScan();
  setupEventListeners();
  checkClipboardForAddress();
});

function setupEventListeners() {
  scanBtn.addEventListener('click', performScan);
  retryBtn.addEventListener('click', performScan);
  addressInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performScan();
  });
  viewFullReport.addEventListener('click', openFullReport);
  copyResults.addEventListener('click', copyResultsToClipboard);
}

// Check clipboard for token address on popup open
async function checkClipboardForAddress() {
  try {
    const text = await navigator.clipboard.readText();
    if (isValidAddress(text) && !addressInput.value) {
      addressInput.value = text;
      addressInput.select();
    }
  } catch (e) {
    // Clipboard access denied - that's fine
  }
}

function isValidAddress(address) {
  if (!address) return false;
  const trimmed = address.trim();
  // EVM address (0x...)
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return true;
  // Solana address (base58, 32-44 chars)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) return true;
  return false;
}

function detectNetwork(address) {
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return 'eth'; // Default EVM to ETH, API will auto-detect
  }
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return 'solana';
  }
  return 'auto';
}

async function performScan() {
  const address = addressInput.value.trim();
  
  if (!address) {
    showError('Please enter a token address');
    return;
  }
  
  if (!isValidAddress(address)) {
    showError('Invalid token address format');
    return;
  }

  const network = networkSelect.value === 'auto' ? detectNetwork(address) : networkSelect.value;
  
  showLoading();
  
  try {
    const response = await fetch(`${API_BASE}/risk-orchestrator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        network: network === 'auto' ? undefined : network,
        includeAI: false // Keep it fast for extension
      })
    });

    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to analyze token');
    }
    
    currentScanResult = result.data;
    saveScan(address, network, result.data);
    displayResults(result.data);
    
  } catch (error) {
    console.error('Scan error:', error);
    showError(error.message || 'Failed to scan token. Please try again.');
  }
}

function showLoading() {
  emptyState.classList.add('hidden');
  errorState.classList.add('hidden');
  resultsSection.classList.add('hidden');
  loadingState.classList.remove('hidden');
  scanBtn.disabled = true;
}

function showError(message) {
  loadingState.classList.add('hidden');
  emptyState.classList.add('hidden');
  resultsSection.classList.add('hidden');
  errorMessage.textContent = message;
  errorState.classList.remove('hidden');
  scanBtn.disabled = false;
}

function displayResults(data) {
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  emptyState.classList.add('hidden');
  scanBtn.disabled = false;
  
  // Token info
  if (data.token.imageUrl) {
    tokenImage.src = data.token.imageUrl;
    tokenImage.style.display = 'block';
  } else {
    tokenImage.style.display = 'none';
  }
  tokenName.textContent = data.token.name || 'Unknown Token';
  tokenSymbol.textContent = data.token.symbol || '???';
  tokenNetwork.textContent = data.token.network?.toUpperCase() || 'ETH';
  
  // Risk score gauge
  const score = data.riskAssessment.overallScore;
  const dashOffset = 157 - (157 * score / 100);
  gaugeProgress.style.strokeDashoffset = dashOffset;
  scoreText.textContent = score;
  
  // Risk level badge
  const level = data.riskAssessment.riskLevel;
  riskLevel.textContent = level;
  riskLevel.className = 'risk-level ' + getLevelClass(level);
  
  // Quick stats
  updateHoneypotStatus(data.securityData.isHoneypot);
  buyTax.textContent = formatTax(data.securityData.buyTax);
  buyTax.className = 'stat-value ' + getTaxClass(data.securityData.buyTax);
  sellTax.textContent = formatTax(data.securityData.sellTax);
  sellTax.className = 'stat-value ' + getTaxClass(data.securityData.sellTax);
  liquidity.textContent = formatLiquidity(data.marketData.liquidity);
  liquidity.className = 'stat-value ' + getLiquidityClass(data.marketData.liquidity);
  
  // Risk factors
  renderRiskFactors(data.riskFactors);
  
  resultsSection.classList.remove('hidden');
}

function getLevelClass(level) {
  switch (level) {
    case 'LOW': return 'safe';
    case 'MEDIUM': return 'caution';
    case 'HIGH': return 'warning';
    case 'CRITICAL': return 'danger';
    default: return '';
  }
}

function updateHoneypotStatus(isHoneypot) {
  if (isHoneypot === true) {
    honeypotStatus.textContent = 'YES';
    honeypotStatus.className = 'stat-value status-danger';
  } else if (isHoneypot === false) {
    honeypotStatus.textContent = 'NO';
    honeypotStatus.className = 'stat-value status-safe';
  } else {
    honeypotStatus.textContent = '??';
    honeypotStatus.className = 'stat-value status-unknown';
  }
}

function formatTax(tax) {
  if (tax === null || tax === undefined) return '--';
  return `${tax}%`;
}

function getTaxClass(tax) {
  if (tax === null || tax === undefined) return 'status-unknown';
  if (tax > 10) return 'status-danger';
  if (tax > 5) return 'status-warning';
  return 'status-safe';
}

function formatLiquidity(liq) {
  if (!liq || liq === 0) return '--';
  if (liq >= 1000000) return `$${(liq / 1000000).toFixed(1)}M`;
  if (liq >= 1000) return `$${(liq / 1000).toFixed(0)}K`;
  return `$${liq.toFixed(0)}`;
}

function getLiquidityClass(liq) {
  if (!liq) return 'status-unknown';
  if (liq < 10000) return 'status-danger';
  if (liq < 50000) return 'status-warning';
  return 'status-safe';
}

function renderRiskFactors(factors) {
  if (!factors || factors.length === 0) {
    riskFactorsList.innerHTML = '<li class="risk-factor-item">No risk factors detected</li>';
    return;
  }
  
  riskFactorsList.innerHTML = factors.slice(0, 5).map(factor => {
    const iconClass = factor.status === 'safe' ? 'safe' : factor.status === 'warning' ? 'warning' : 'danger';
    const icon = factor.status === 'safe' ? '✓' : factor.status === 'warning' ? '!' : '✕';
    return `
      <li class="risk-factor-item">
        <span class="risk-factor-icon ${iconClass}">${icon}</span>
        <span>${factor.name}</span>
      </li>
    `;
  }).join('');
}

function openFullReport() {
  if (!currentScanResult) return;
  const address = addressInput.value.trim();
  const url = `https://aidyor.app/?address=${encodeURIComponent(address)}`;
  chrome.tabs.create({ url });
}

async function copyResultsToClipboard() {
  if (!currentScanResult) return;
  
  const data = currentScanResult;
  const text = `🛡️ AIDYOR Token Scan

Token: ${data.token.name} (${data.token.symbol})
Network: ${data.token.network}
Address: ${data.token.address}

Risk Score: ${data.riskAssessment.overallScore}/100 (${data.riskAssessment.riskLevel})
Honeypot: ${data.securityData.isHoneypot ? '⚠️ YES' : '✅ NO'}
Buy Tax: ${data.securityData.buyTax}%
Sell Tax: ${data.securityData.sellTax}%
Liquidity: ${formatLiquidity(data.marketData.liquidity)}

Scanned by AIDYOR - https://aidyor.app`;

  try {
    await navigator.clipboard.writeText(text);
    copyResults.textContent = 'Copied!';
    setTimeout(() => {
      copyResults.textContent = 'Copy Results';
    }, 2000);
  } catch (e) {
    console.error('Copy failed:', e);
  }
}

// Storage functions
function saveScan(address, network, data) {
  chrome.storage.local.set({
    lastScan: {
      address,
      network,
      data,
      timestamp: Date.now()
    }
  });
}

function loadLastScan() {
  chrome.storage.local.get('lastScan', (result) => {
    if (result.lastScan && Date.now() - result.lastScan.timestamp < 300000) { // 5 min cache
      addressInput.value = result.lastScan.address;
      networkSelect.value = result.lastScan.network;
      currentScanResult = result.lastScan.data;
      displayResults(result.lastScan.data);
    }
  });
}
