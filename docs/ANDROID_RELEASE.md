# Android / Google Play Release Guide

## What is already configured

- Capacitor Android platform added (`android/`)
- Package name: `com.teeneffort.app`
- Icons and splash screens generated
- Location, internet, and notification permissions in `AndroidManifest.xml`
- RevenueCat SDK now picks the right key for Android (`goog_…`)
- Build scripts in `package.json`:
  - `npm run android:dev` — live reload to the Lovable preview
  - `npm run android:release` — production build and open Android Studio

## Local setup

1. Install **Android Studio** (latest stable).
2. Inside Android Studio, install the Android SDK and accept licenses.
3. From the project root run:
   ```bash
   npm install
   npm run android:release
   ```
   This opens Android Studio with the `android/` project.
4. In Android Studio, pick a device/emulator and run the app.

## Google Play Console

1. Pay the one-time $25 developer fee and create an account.
2. Create an app with **package name** `com.teeneffort.app`.
3. Fill out:
   - Store listing
   - Content rating questionnaire
   - Privacy policy URL
   - Data safety form
4. Enable **Google Play App Signing** (recommended).

## In-app purchases (Google Play Billing)

1. In Play Console, create subscription products matching your tiers.
2. In RevenueCat:
   - Add your Android app.
   - Link Google Play with a service-account JSON.
   - Create a RevenueCat Android public SDK key (`goog_…`).
3. Add the key to the project:
   - `.env` for development
   - `.env.production` for release builds
   ```
   VITE_REVENUECAT_ANDROID_KEY="goog_..."
   ```
4. Attach your existing `teen effort pro` entitlement to the Android products.

## Build and submit

1. In Android Studio:
   - **Build → Generate Signed Bundle / APK → Android App Bundle**.
   - Upload the `.aab` to Play Console.
2. Start with **Closed testing** to invite testers.
3. Once stable, promote to Production.

## Teen-app compliance notes

Because Teen Effort targets minors/teenagers, expect extra Google Play review scrutiny. Make sure you clearly disclose:

- Minimum age and age-gate flow
- User-generated content moderation (forum, chat, reviews)
- Report and block features
- Data collection practices and parental consent
- Human review process for expert advice/AI content
