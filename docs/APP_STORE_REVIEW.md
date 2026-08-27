# App Store Review Prep — Teen Effort

Bundle ID: `com.teeneffort.app` · Support URL: `https://teeneffort.app/support` · Terms: `https://teeneffort.app/terms`

## 1. App Review Information (paste into App Store Connect)

**Sign-in required:** Yes — provide a demo account.

```
Demo account
Email: review@teeneffort.app
Password: <set this and keep it active through review>
```

Create it in the app with email signup, confirm it, complete profile setup, and leave it
signed-in-ready (no partner link required — the app works solo).

**Notes for Review:**

```
Teen Effort is an AI-assisted date planning and relationship app.

SIGN IN
- Use the demo account above (email + password). Email verification is already completed
  for this account, so no verification code is needed.
- Sign in with Apple and Google are also available.

SUBSCRIPTIONS (auto-renewable, 3 tiers)
- Spark, Romance, Soulmate — monthly and yearly.
- All purchases on iOS use StoreKit via RevenueCat. No external purchase links,
  no alternative payment methods, and no mention of web pricing inside the iOS build.
- "Restore Purchases" is available on the Pricing screen.
- Free tier includes 5 AI date generations and 2 AI gift generations per month.

LOCATION
- Location is optional and only used to suggest nearby date ideas. The app works with a
  manually entered location if permission is denied.

MINORS / SAFETY
- Age gate at signup (date of birth wheel).
- User-generated content (forum posts, reviews, journal) is moderated; report and block
  actions are available on user content.
- AI relationship advice is clearly labeled as AI-generated and is not professional
  counseling; crisis resources are surfaced in the Support page.

CONTACT
support.teeneffort@gmail.com
```

## 2. Required metadata checklist

| Item | Value / action |
| --- | --- |
| Age rating | Complete questionnaire; expect 12+/17+ depending on UGC + dating answers |
| Privacy policy URL | Required — must be reachable, not behind auth |
| Support URL | `https://teeneffort.app/support` |
| Subscription group | One group ("Teen Effort") with all 6 products, ranked Spark < Romance < Soulmate |
| Subscription display name + description | Set per product (55-char taglines already written) |
| Localized subscription screenshot | Required for each product (screenshot of the Pricing screen) |
| App Privacy ("Data Safety") | Declare: email, phone (optional), coarse location, user content, identifiers, purchases |
| Account deletion | In-app deletion exists (`delete-account` function) — confirm the path is discoverable in Settings |
| Paid Apps Agreement | Signed ✅ |

## 3. Guideline 3.1.1 (in-app purchase) — verify before upload

On a native iOS build:
- Pricing screen shows **StoreKit** prices (Apple-localized `priceString`), not `$4.99` hardcoded.
- No Stripe checkout, billing portal, or "manage on the web" link appears.
- No copy that steers users to an external purchase page.
- Restore Purchases button visible.

## 4. Guideline 1.2 / 5.1.1 (UGC + minors) — verify before upload

- Age gate cannot be bypassed by going back.
- Every UGC surface (forum, reviews, chat) has a report action.
- Blocked users' content is hidden.
- Terms link reachable from Settings and from signup.

## 5. Build and upload

```bash
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode:
1. Target → Signing & Capabilities → Team set, Bundle ID `com.teeneffort.app`.
2. Capabilities include **In-App Purchase**, **Push Notifications**, **Sign in with Apple**.
3. Bump `Version` / `Build`.
4. Product → Destination → **Any iOS Device (arm64)** → Product → Archive.
5. Distribute App → App Store Connect → Upload.

## 6. TestFlight pass (do this before submitting)

- Install via TestFlight on a real device with a **real** Apple ID.
- Confirm plans load, a purchase completes, and the tier unlocks.
- Confirm Restore Purchases returns the tier after reinstall.
- Confirm location prompt, notifications prompt, and Google/Apple sign-in all work.
- Watch for any console error about offerings; zero products = catalog/agreement issue, not code.

## 7. Common rejection causes for this app

1. Subscription metadata incomplete (missing per-product screenshot or description).
2. Missing "Restore Purchases" or terms/privacy links near the purchase UI.
3. Web payment reference visible on iOS.
4. UGC without reporting/blocking, given the app targets teens.
5. Demo account that stops working mid-review — keep it active and unexpired.
