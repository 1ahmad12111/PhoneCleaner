# Cleaner Neat: Clean Up Storage

A React Native (Expo) storage-cleaner app for iPhone (Android works too).

- **Similar photos** – burst/near-identical shots grouped together, best one kept automatically
- **Duplicates** – exact copies of the same photo
- **Screenshots**, **Large videos** (sorted by size), **Live Photos**
- **Swipe Cleaner** – Tinder-style review of the camera roll, month by month
- **Contacts** – merge duplicates, delete empty entries
- **Pro subscription** via RevenueCat with a free daily quota, onboarding and an App Store–compliant paywall
- Everything runs on-device; light & dark mode

## Run it

This app uses native modules (photo library, contacts, in-app purchases), so use a development build rather than Expo Go:

```bash
npm install
npx expo run:ios            # needs a Mac with Xcode
# or build in the cloud, no Mac needed:
npx eas-cli@latest build -p ios --profile development
npx expo start --dev-client
```

In Expo Go the app still runs but purchases are disabled.

## Project layout

```
src/app/            screens (Expo Router)
  (tabs)/           Clean, Swipe, Contacts, Settings
  category/[id].tsx category detail with selection + delete
  onboarding.tsx    first-launch flow
  paywall.tsx       subscription screen
src/context/        ProContext (RevenueCat + free quota), ScanContext (scan + delete)
src/lib/            media scanner, contacts scanner, storage, config
docs/               privacy policy (GitHub Pages) and App Store launch kit
```

## Before you publish

1. Set your bundle id in `app.json` and support email in `src/lib/config.ts`.
2. Create subscriptions + RevenueCat entitlement `pro`, then set `EXPO_PUBLIC_RC_IOS_KEY`.
3. Enable GitHub Pages on `/docs` so the privacy policy URL works.
4. Follow **[docs/APP_STORE.md](docs/APP_STORE.md)** for listing text, keywords, screenshots and review notes.

## Checks

```bash
npm run typecheck
npm run lint
```
