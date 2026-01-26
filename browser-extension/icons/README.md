# AIDYOR Extension Icons

This folder should contain the following icon files:

- `icon-16.png` - 16x16 pixels (toolbar small)
- `icon-32.png` - 32x32 pixels (toolbar)
- `icon-48.png` - 48x48 pixels (extension management)
- `icon-128.png` - 128x128 pixels (Chrome Web Store)

## Design Guidelines

- Use a shield icon with the AIDYOR gradient (green #00ff88 to cyan #00ccff)
- Ensure icons are clear and recognizable at small sizes
- Use transparent background
- PNG format with transparency

## Generating Icons

You can use the main logo and resize it, or create a simplified version for smaller sizes.

### Quick SVG Template

```svg
<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00ff88"/>
      <stop offset="100%" style="stop-color:#00ccff"/>
    </linearGradient>
  </defs>
  <path d="M64 8 L120 28 V68 C120 100 64 120 64 120 C64 120 8 100 8 68 V28 Z" 
        fill="url(#grad)" stroke="none"/>
  <path d="M50 64 L60 74 L80 54" 
        fill="none" stroke="#0a0a0f" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Copy this SVG template and export at required sizes.
