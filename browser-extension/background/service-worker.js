// AIDYOR Browser Extension - Background Service Worker

const API_BASE = 'https://ckhagucgyjnpvcolcihc.supabase.co/functions/v1';

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for selected text (token addresses)
  chrome.contextMenus.create({
    id: 'aidyor-scan-selection',
    title: 'Scan with AIDYOR',
    contexts: ['selection']
  });
  
  // Create context menu for links
  chrome.contextMenus.create({
    id: 'aidyor-scan-link',
    title: 'Scan token with AIDYOR',
    contexts: ['link']
  });
  
  console.log('[AIDYOR] Extension installed, context menus created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let address = null;
  
  if (info.menuItemId === 'aidyor-scan-selection') {
    address = extractAddress(info.selectionText);
  } else if (info.menuItemId === 'aidyor-scan-link') {
    address = extractAddressFromUrl(info.linkUrl);
  }
  
  if (address) {
    // Open popup with the address pre-filled
    // Since we can't programmatically open the popup, we'll store the address
    // and the popup will read it when opened
    await chrome.storage.local.set({
      pendingAddress: address,
      pendingTimestamp: Date.now()
    });
    
    // Show a notification that user can click to open popup
    await showNotification(
      'Token Address Found',
      `Click the AIDYOR icon to scan: ${address.slice(0, 8)}...${address.slice(-6)}`
    );
  } else {
    await showNotification(
      'No Token Address Found',
      'Could not find a valid token address in the selection.'
    );
  }
});

// Extract token address from text
function extractAddress(text) {
  if (!text) return null;
  const trimmed = text.trim();
  
  // EVM address (0x...)
  const evmMatch = trimmed.match(/0x[a-fA-F0-9]{40}/);
  if (evmMatch) return evmMatch[0];
  
  // Solana address (base58, 32-44 chars) - more strict pattern
  const solMatch = trimmed.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  if (solMatch) {
    // Validate it's not just random text
    const addr = solMatch[0];
    if (addr.length >= 32 && addr.length <= 44) {
      return addr;
    }
  }
  
  return null;
}

// Extract address from URL (e.g., DEXScreener, Etherscan)
function extractAddressFromUrl(url) {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // DEXScreener: /solana/ADDRESS or /ethereum/ADDRESS
    const dexMatch = pathname.match(/\/(solana|ethereum|bsc|polygon|arbitrum|base|optimism|avalanche)\/([a-zA-Z0-9]+)/);
    if (dexMatch) return dexMatch[2];
    
    // Etherscan/BSCScan/etc: /token/ADDRESS or /address/ADDRESS
    const scanMatch = pathname.match(/\/(token|address)\/(0x[a-fA-F0-9]{40})/);
    if (scanMatch) return scanMatch[2];
    
    // Solscan: /token/ADDRESS
    const solscanMatch = pathname.match(/\/token\/([1-9A-HJ-NP-Za-km-z]{32,44})/);
    if (solscanMatch) return solscanMatch[1];
    
    // Birdeye: /token/ADDRESS
    const birdeyeMatch = pathname.match(/\/token\/([a-zA-Z0-9]+)/);
    if (birdeyeMatch) return birdeyeMatch[1];
    
    // Generic: look for address in pathname
    return extractAddress(pathname);
  } catch (e) {
    return null;
  }
}

// Show browser notification
async function showNotification(title, message) {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon-128.png',
      title,
      message,
      priority: 2
    });
  } catch (e) {
    console.error('[AIDYOR] Notification error:', e);
  }
}

// Message handling from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scanToken') {
    scanToken(request.address, request.network)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getPendingAddress') {
    chrome.storage.local.get(['pendingAddress', 'pendingTimestamp'], (result) => {
      // Only return if less than 30 seconds old
      if (result.pendingAddress && Date.now() - result.pendingTimestamp < 30000) {
        chrome.storage.local.remove(['pendingAddress', 'pendingTimestamp']);
        sendResponse({ address: result.pendingAddress });
      } else {
        sendResponse({ address: null });
      }
    });
    return true;
  }
});

// Scan token via API
async function scanToken(address, network) {
  const response = await fetch(`${API_BASE}/risk-orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      address,
      network: network || undefined,
      includeAI: false
    })
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Scan failed');
  }
  
  return result.data;
}

// Listen for tab updates to detect supported sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const supportedSites = [
      'dexscreener.com',
      'coingecko.com',
      'dextools.io',
      'birdeye.so',
      'etherscan.io',
      'bscscan.com',
      'polygonscan.com',
      'arbiscan.io',
      'basescan.org',
      'solscan.io'
    ];
    
    const isSupportedSite = supportedSites.some(site => tab.url.includes(site));
    
    // Update badge to show extension is active on supported sites
    if (isSupportedSite) {
      chrome.action.setBadgeText({ tabId, text: '✓' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#00ff88' });
    } else {
      chrome.action.setBadgeText({ tabId, text: '' });
    }
  }
});
