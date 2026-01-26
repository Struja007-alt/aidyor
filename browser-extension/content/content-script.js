// AIDYOR Browser Extension - Content Script
// Runs on supported DEX/Explorer sites to add quick-scan functionality

(function() {
  'use strict';

  const SUPPORTED_PATTERNS = {
    dexscreener: /dexscreener\.com\/(solana|ethereum|bsc|polygon|arbitrum|base|optimism|avalanche)\/([a-zA-Z0-9]+)/,
    etherscan: /etherscan\.io\/token\/(0x[a-fA-F0-9]{40})/,
    bscscan: /bscscan\.com\/token\/(0x[a-fA-F0-9]{40})/,
    polygonscan: /polygonscan\.com\/token\/(0x[a-fA-F0-9]{40})/,
    arbiscan: /arbiscan\.io\/token\/(0x[a-fA-F0-9]{40})/,
    basescan: /basescan\.org\/token\/(0x[a-fA-F0-9]{40})/,
    solscan: /solscan\.io\/token\/([1-9A-HJ-NP-Za-km-z]{32,44})/,
    birdeye: /birdeye\.so\/token\/([a-zA-Z0-9]+)/,
    coingecko: /coingecko\.com\/.*coins\/([a-z0-9-]+)/,
    dextools: /dextools\.io\/app\/[a-z]+\/pair-explorer\/([a-zA-Z0-9]+)/
  };

  let floatingButton = null;
  let currentAddress = null;
  let currentNetwork = null;

  // Initialize content script
  function init() {
    detectTokenOnPage();
    createFloatingButton();
    observeUrlChanges();
  }

  // Detect token address from current URL
  function detectTokenOnPage() {
    const url = window.location.href;
    
    for (const [site, pattern] of Object.entries(SUPPORTED_PATTERNS)) {
      const match = url.match(pattern);
      if (match) {
        if (site === 'dexscreener') {
          currentNetwork = match[1];
          currentAddress = match[2];
        } else if (site === 'coingecko') {
          // CoinGecko uses slugs, not addresses - skip for now
          return;
        } else {
          currentAddress = match[1];
          currentNetwork = getNetworkFromSite(site);
        }
        
        console.log(`[AIDYOR] Detected token: ${currentAddress} on ${currentNetwork}`);
        showFloatingButton();
        return;
      }
    }
    
    hideFloatingButton();
  }

  function getNetworkFromSite(site) {
    const networkMap = {
      etherscan: 'eth',
      bscscan: 'bsc',
      polygonscan: 'polygon',
      arbiscan: 'arbitrum',
      basescan: 'base',
      solscan: 'solana',
      birdeye: 'solana'
    };
    return networkMap[site] || 'eth';
  }

  // Create floating scan button
  function createFloatingButton() {
    if (floatingButton) return;
    
    floatingButton = document.createElement('div');
    floatingButton.id = 'aidyor-scan-button';
    floatingButton.innerHTML = `
      <div class="aidyor-btn-content">
        <svg class="aidyor-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        <span class="aidyor-text">Scan with AIDYOR</span>
      </div>
    `;
    
    floatingButton.addEventListener('click', handleScanClick);
    document.body.appendChild(floatingButton);
  }

  function showFloatingButton() {
    if (floatingButton) {
      floatingButton.classList.add('aidyor-visible');
    }
  }

  function hideFloatingButton() {
    if (floatingButton) {
      floatingButton.classList.remove('aidyor-visible');
    }
    currentAddress = null;
    currentNetwork = null;
  }

  // Handle scan button click
  async function handleScanClick() {
    if (!currentAddress) return;
    
    floatingButton.classList.add('aidyor-loading');
    
    try {
      // Send message to background script to scan
      const response = await chrome.runtime.sendMessage({
        action: 'scanToken',
        address: currentAddress,
        network: currentNetwork
      });
      
      if (response.success) {
        showResultOverlay(response.data);
      } else {
        showErrorOverlay(response.error || 'Scan failed');
      }
    } catch (error) {
      console.error('[AIDYOR] Scan error:', error);
      showErrorOverlay(error.message);
    } finally {
      floatingButton.classList.remove('aidyor-loading');
    }
  }

  // Show result overlay
  function showResultOverlay(data) {
    removeExistingOverlay();
    
    const score = data.riskAssessment?.overallScore ?? 0;
    const level = data.riskAssessment?.riskLevel ?? 'UNKNOWN';
    const levelClass = getLevelClass(level);
    
    const overlay = document.createElement('div');
    overlay.id = 'aidyor-overlay';
    overlay.innerHTML = `
      <div class="aidyor-overlay-content">
        <div class="aidyor-overlay-header">
          <div class="aidyor-overlay-logo">
            <span class="aidyor-logo-text">AIDYOR</span>
          </div>
          <button class="aidyor-close-btn" id="aidyor-close">&times;</button>
        </div>
        
        <div class="aidyor-overlay-body">
          <div class="aidyor-token-info">
            ${data.token?.imageUrl ? `<img src="${data.token.imageUrl}" alt="" class="aidyor-token-img">` : ''}
            <div class="aidyor-token-details">
              <span class="aidyor-token-name">${data.token?.name || 'Unknown'}</span>
              <span class="aidyor-token-symbol">${data.token?.symbol || '???'}</span>
            </div>
          </div>
          
          <div class="aidyor-score ${levelClass}">
            <span class="aidyor-score-value">${score}</span>
            <span class="aidyor-score-label">/100</span>
          </div>
          
          <div class="aidyor-risk-level ${levelClass}">${level} RISK</div>
          
          <div class="aidyor-stats">
            <div class="aidyor-stat">
              <span class="aidyor-stat-label">Honeypot</span>
              <span class="aidyor-stat-value ${data.securityData?.isHoneypot ? 'danger' : 'safe'}">
                ${data.securityData?.isHoneypot ? 'YES ⚠️' : 'NO ✓'}
              </span>
            </div>
            <div class="aidyor-stat">
              <span class="aidyor-stat-label">Buy Tax</span>
              <span class="aidyor-stat-value">${data.securityData?.buyTax ?? '--'}%</span>
            </div>
            <div class="aidyor-stat">
              <span class="aidyor-stat-label">Sell Tax</span>
              <span class="aidyor-stat-value">${data.securityData?.sellTax ?? '--'}%</span>
            </div>
            <div class="aidyor-stat">
              <span class="aidyor-stat-label">Liquidity</span>
              <span class="aidyor-stat-value">${formatLiquidity(data.marketData?.liquidity)}</span>
            </div>
          </div>
          
          <a href="https://aidyor.app/?address=${encodeURIComponent(currentAddress)}" 
             target="_blank" 
             class="aidyor-full-report-btn">
            View Full Report →
          </a>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Close button
    document.getElementById('aidyor-close').addEventListener('click', removeExistingOverlay);
    
    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) removeExistingOverlay();
    });
    
    // ESC to close
    document.addEventListener('keydown', handleEscKey);
  }

  function showErrorOverlay(message) {
    removeExistingOverlay();
    
    const overlay = document.createElement('div');
    overlay.id = 'aidyor-overlay';
    overlay.innerHTML = `
      <div class="aidyor-overlay-content aidyor-error">
        <div class="aidyor-overlay-header">
          <div class="aidyor-overlay-logo">
            <span class="aidyor-logo-text">AIDYOR</span>
          </div>
          <button class="aidyor-close-btn" id="aidyor-close">&times;</button>
        </div>
        
        <div class="aidyor-overlay-body">
          <div class="aidyor-error-icon">⚠️</div>
          <p class="aidyor-error-msg">${message}</p>
          <button class="aidyor-retry-btn" id="aidyor-retry">Try Again</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('aidyor-close').addEventListener('click', removeExistingOverlay);
    document.getElementById('aidyor-retry').addEventListener('click', () => {
      removeExistingOverlay();
      handleScanClick();
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) removeExistingOverlay();
    });
  }

  function removeExistingOverlay() {
    const existing = document.getElementById('aidyor-overlay');
    if (existing) existing.remove();
    document.removeEventListener('keydown', handleEscKey);
  }

  function handleEscKey(e) {
    if (e.key === 'Escape') removeExistingOverlay();
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

  function formatLiquidity(liq) {
    if (!liq || liq === 0) return '--';
    if (liq >= 1000000) return `$${(liq / 1000000).toFixed(1)}M`;
    if (liq >= 1000) return `$${(liq / 1000).toFixed(0)}K`;
    return `$${liq.toFixed(0)}`;
  }

  // Observe URL changes for SPA sites
  function observeUrlChanges() {
    let lastUrl = location.href;
    
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        detectTokenOnPage();
      }
    }).observe(document, { subtree: true, childList: true });
    
    // Also listen for popstate
    window.addEventListener('popstate', detectTokenOnPage);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
