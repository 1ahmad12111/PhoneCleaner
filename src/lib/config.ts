import { Platform } from 'react-native';

/**
 * App-wide configuration. Replace the placeholder URLs and set the RevenueCat
 * keys as EAS environment variables (EXPO_PUBLIC_RC_IOS_KEY / EXPO_PUBLIC_RC_ANDROID_KEY).
 */
export const config = {
  appName: 'Cleaner Neat',
  /** RevenueCat entitlement identifier that unlocks Pro. */
  entitlementId: 'pro',
  revenueCatKey: Platform.select({
    ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
    android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
  }),
  /** Number of items a free user may delete per day before the paywall appears. */
  freeDailyDeleteLimit: 20,
  privacyUrl: 'https://1ahmad12111.github.io/PhoneCleaner/privacy.html',
  termsUrl: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  // TODO: replace with your own support address before submitting.
  supportEmail: 'support@cleanerneat.app',
  /** Numeric App Store id, used for the "Rate us" and share links once the app is live. */
  appStoreId: '',
};
