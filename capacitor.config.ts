import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.eaa8d564cf6a4d6f81e20ddab66a4a49',
  appName: 'AIDYOR',
  webDir: 'dist',
  server: {
    url: 'https://eaa8d564-cf6a-4d6f-81e2-0ddab66a4a49.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      launchFadeOutDuration: 300,
      backgroundColor: '#0a0a0f',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#00ff88',
      splashFullScreen: true,
      splashImmersive: true
    }
  },
  android: {
    backgroundColor: '#0a0a0f'
  }
};

export default config;
