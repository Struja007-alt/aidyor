import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.aidyor.mobile',
  appName: 'AIDYOR',
  webDir: 'dist',
  
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
