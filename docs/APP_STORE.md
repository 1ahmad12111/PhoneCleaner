# App Store launch kit — Cleaner Neat: Clean Up Storage

Everything you need to fill in App Store Connect, set up subscriptions and get through review.

## 1. App Store Connect listing

| Field | Value |
| --- | --- |
| **Name** (30 max) | `Cleaner Neat: Clean Up Storage` |
| **Subtitle** (30 max) | `Remove Duplicates & Free Space` |
| **Bundle ID** | `com.cleanerneat.app` (change in `app.json` if taken) |
| **Primary category** | Utilities |
| **Secondary category** | Photo & Video |
| **Age rating** | 4+ |
| **Price** | Free (with in-app subscriptions) |

**Keywords** (100 chars, comma separated, no spaces):

```
cleaner,storage,duplicate,photo,cleanup,clean,space,remover,swipe,contacts,video,compress,free,phone
```

**Promotional text** (170 max):

> Phone full? Cleaner Neat finds duplicate photos, similar shots, old screenshots and huge videos in seconds — then clears them with one tap.

**Description:**

```
Running out of storage? Cleaner Neat makes your iPhone neat again in minutes.

Cleaner Neat scans your photo library on-device and groups everything you probably don't need:

• SIMILAR PHOTOS – burst shots and near-identical photos taken seconds apart. We pick the best one and pre-select the rest.
• DUPLICATES – exact copies of the same photo, e.g. pictures saved twice from chats.
• SCREENSHOTS – old screenshots piling up in your camera roll.
• LARGE VIDEOS – your biggest videos, sorted by size, so you know exactly what's eating your space.
• LIVE PHOTOS – find Live Photos that take roughly twice the space of a still.

SWIPE CLEANER
Go through your camera roll month by month. Swipe left to delete, right to keep. Fast, fun and oddly satisfying.

CONTACTS CLEANUP
Merge duplicate contacts and delete empty entries without the hassle.

PRIVATE BY DESIGN
Everything is analysed on your device. Your photos and contacts are never uploaded.

CLEANER NEAT PRO
Free users can clean a limited number of items every day. Upgrade to Pro for unlimited cleaning.
• Payment will be charged to your Apple ID account at confirmation of purchase.
• Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period.
• Your account will be charged for renewal within 24 hours prior to the end of the current period.
• You can manage and cancel your subscriptions in your App Store account settings.

Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://1ahmad12111.github.io/PhoneCleaner/privacy.html
```

**URLs**

- Privacy Policy URL: `https://1ahmad12111.github.io/PhoneCleaner/privacy.html` (enable GitHub Pages: repo Settings → Pages → Deploy from branch → `main` / `/docs`).
- Support URL: the same GitHub Pages site or any page with your contact email.

## 2. Subscriptions (how you make money)

Create these in App Store Connect → your app → **Subscriptions**, all in one subscription group called `Cleaner Neat Pro`:

| Product ID | Duration | Suggested price | Intro offer |
| --- | --- | --- | --- |
| `cleanerneat_pro_weekly` | 1 week | $4.99 | none |
| `cleanerneat_pro_yearly` | 1 year | $29.99 | 3-day free trial |

Then in [RevenueCat](https://app.revenuecat.com) (free up to $2.5k monthly revenue):

1. Create a project and an iOS app, paste your App Store Connect **In-App Purchase key** / shared secret.
2. Create an **entitlement** with identifier `pro`.
3. Import both products and attach them to the `pro` entitlement.
4. Create an **offering** named `default`, mark it **current**, and add packages: `$rc_annual` → yearly, `$rc_weekly` → weekly.
5. Copy the iOS **public SDK key** (starts with `appl_`) and add it to EAS:

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_RC_IOS_KEY --value appl_XXXXXXXX --environment production --visibility plaintext
```

The free tier allows 20 deletions per day (`freeDailyDeleteLimit` in `src/lib/config.ts`). Lower it to push more people to Pro, raise it for better reviews.

## 3. App Privacy (“nutrition label”)

In App Store Connect → App Privacy:

- **Data collection:** select *“Yes, we collect data”* only for **Purchases → Purchase History** (collected by RevenueCat, linked to an anonymous ID, not used for tracking). Everything else: not collected.
- **Tracking:** No.

## 4. Screenshots (required: 6.9" iPhone, 1320×2868 or 1290×2796)

Suggested 5 frames, each with a big caption on top:

1. Home dashboard storage ring — **“Free up GBs in one tap”**
2. Similar photos group with BEST badge — **“We keep the best shot”**
3. Swipe cleaner mid-swipe — **“Swipe left to delete”**
4. Large videos grid — **“Find space-hogging videos”**
5. Contacts duplicates — **“Merge duplicate contacts”**

Capture them from the iOS Simulator (`Cmd+S`) with a sample library, then add captions in Figma/Canva or with a tool like AppLaunchpad.

## 5. Review notes (paste into “App Review Information → Notes”)

```
Cleaner Neat analyses the user's photo library and contacts entirely on-device.
Nothing is uploaded. Deletion always uses the iOS system confirmation dialog and
items go to "Recently Deleted". Free users can delete 20 items per day; the Pro
subscription removes the limit. Subscriptions can be restored from Settings → Restore purchases.
To test: grant photo access on first launch, tap "Scan", open any category and delete.
```

## 6. Review pitfalls we already handled

- **Guideline 2.3.1 / 5.x (misleading cleaner claims):** the app never claims to clear “junk”, “cache” or “viruses” (impossible on iOS). It only deals with photos, videos and contacts, and sizes are labelled as estimates.
- **Guideline 3.1.2 (subscriptions):** paywall shows the price, period, trial terms, auto-renew text, Terms and Privacy links, a Restore button and a close (X) button.
- **Guideline 5.1.1 (permissions):** clear purpose strings in `app.json`; contacts permission is only asked when the user opens the Contacts tab.
- `ITSAppUsesNonExemptEncryption` is set to `false`, so no export-compliance questions on each build.

## 7. Build & submit

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest init                 # links the project to your Expo account
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest submit -p ios --latest
```

You need an **Apple Developer Program** membership ($99/year). EAS handles certificates and provisioning profiles for you.
