# AIDYOR Browser Extension

AI-powered cryptocurrency token risk scanner for Chrome and Firefox.

## Features

- 🔍 **Quick Token Scanning** - Paste any token address to get instant risk analysis
- 🎯 **Auto-Detection** - Automatically detects tokens on DEXScreener, Etherscan, and other sites
- 📊 **Risk Score Display** - See the 0-100 safety score with visual gauge
- 🛡️ **Honeypot Detection** - Instant honeypot and tax warnings
- 📋 **Copy Results** - One-click copy scan results to share
- 🔗 **Deep Links** - View full reports on aidyor.app

## Supported Sites

The extension automatically detects tokens on:
- DEXScreener
- CoinGecko
- DexTools
- Birdeye
- Etherscan
- BSCScan
- PolygonScan
- Arbiscan
- BaseScan
- Solscan

## Supported Networks

- Ethereum (ETH)
- BNB Chain (BSC)
- Solana (SOL)
- Polygon (MATIC)
- Arbitrum (ARB)
- Base
- Optimism (OP)
- Avalanche (AVAX)

## Installation

### Chrome

1. Download or clone this repository
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the `browser-extension` folder

### Firefox

1. Download or clone this repository
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from `browser-extension` folder

## Usage

### Popup Scanner
1. Click the AIDYOR icon in your browser toolbar
2. Paste a token address (0x... or Solana)
3. Select network (or use auto-detect)
4. Click the scan button
5. View results instantly

### Context Menu
1. Right-click on any token address on a webpage
2. Select "Scan with AIDYOR"
3. Open the extension popup to see results

### Floating Button
When visiting supported sites with a token page:
1. A floating "Scan with AIDYOR" button appears
2. Click to instantly analyze the token
3. Results overlay shows without leaving the page

## Development

### File Structure

```
browser-extension/
├── manifest.json           # Extension manifest (MV3)
├── popup/
│   ├── popup.html          # Popup UI
│   ├── popup.css           # Popup styles
│   └── popup.js            # Popup logic
├── background/
│   └── service-worker.js   # Background service worker
├── content/
│   ├── content-script.js   # Content script for DEX sites
│   └── content-styles.css  # Injected styles
├── icons/
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md
```

### Building for Production

1. Ensure all icons are in place (16, 32, 48, 128px)
2. Update version in `manifest.json`
3. Zip the `browser-extension` folder
4. Submit to Chrome Web Store / Firefox Add-ons

### API Endpoint

The extension uses the AIDYOR risk-orchestrator API:
```
POST https://ckhagucgyjnpvcolcihc.supabase.co/functions/v1/risk-orchestrator
```

Request body:
```json
{
  "address": "0x...",
  "network": "eth",
  "includeAI": false
}
```

## Privacy

- No user data is collected
- Only token addresses are sent to the API
- Scan results are cached locally for 5 minutes
- No tracking or analytics

## License

Proprietary - Part of the AIDYOR project
