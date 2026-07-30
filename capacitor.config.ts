import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.civictracker.app',
  appName: 'Civic Issue Tracker',
  webDir: 'out',
  // Server config for development — comment out for production builds
  // server: {
  //   url: 'http://192.168.x.x:3000',
  //   cleartext: true,
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0d0d0f',
      showSpinner: true,
      spinnerColor: '#FF2E11',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0d0d0f',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      // Android-specific camera permissions
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0d0d0f',
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
