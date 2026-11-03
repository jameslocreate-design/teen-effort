# Apple sign-in compliance changes

## Configuration required before live Apple testing

- `APPLE_TEAM_ID`: Apple Developer membership Team ID.
- `APPLE_KEY_ID`: Key ID for a Sign in with Apple-enabled key.
- `APPLE_P8`: entire downloaded Apple private key, including BEGIN/END lines. Enter only through the secure secret form, never chat.
- Native client ID is `com.teeneffort.app`. The key must belong to the team owning that App ID and have Sign in with Apple enabled.
- These credentials support native code exchange/revocation; they do not repair the hosted sign-in audience configuration. Keep `com.teeneffort.app` accepted by the existing Apple BYOC auth configuration.
- Existing native users must sign in with Apple again to capture a code/token before deletion. If no token exists, deletion stops with a clear explanation rather than silently skipping Apple revocation.
- Web currently uses Lovable managed Apple OAuth, which does not expose Apple's authorizationCode to the app. Native token exchange is not a replacement for the managed `/~oauth/apple/revoke` flow. Web-only Apple accounts cannot currently complete deletion through the new native-token flow without signing in on iPhone. Supporting web-only deletion requires a separate managed-revocation path; do not claim it is verified or complete.

## File-by-file changes

- `src/lib/apple-profile.ts`: Apple identity detection, fallback names, name-step gate, native hydration barrier.
- `src/lib/apple-profile-persistence.ts`: persist full_name/given_name/family_name and profiles.name/display_name before onboarding; retain names edited later.
- `src/lib/appleSignIn.ts`: preserve Apple name from the native sheet immediately after verified sign-in; send authorizationCode to authenticated apple-store-token; report failed token setup without requiring a name.
- `src/contexts/AuthContext.tsx`: validate the session and wait for Apple name persistence before publishing the signed-in user or navigating; avoid auth-callback lock work and USER_UPDATED loops.
- `src/components/AppShell.tsx`: Apple users never require a name to finish onboarding; birthday remains required for age compliance.
- `src/components/ProfileSetup.tsx`: hide name field in Apple onboarding, retain optional editing in Profile; email/password onboarding still requires a name.
- `src/pages/AuthPage.tsx`: request web email/name scope; use unmodified official Apple sign-in artwork at 44px height and consistent Sign in with Apple labeling.
- `supabase/functions/_shared/apple-authorization.ts`: server-only ES256 client secret (five-minute expiry), authorization-code exchange with verified Apple subject, refresh-token revocation.
- `supabase/functions/apple-store-token/index.ts`: verify signed-in caller and exchanged Apple subject, then store refresh token with service-role access only. Never log or return codes/tokens.
- `supabase/functions/_shared/account-deletion.ts`: enforce revocation before destructive cleanup; keep stored token until cleanup succeeds so failures remain retryable.
- `supabase/functions/delete-account/index.ts`: revoke first; remove uploaded files (paginated), dependent shared rows, owned data and auth account; stop on cleanup errors instead of reporting false success.
- `src/components/SettingsPage.tsx`: show actual deletion failure reason, check successful response, prevent duplicate confirmation clicks.
- `drizzle/migrations/0006_apple_authorization_tokens_and_display_name.sql`: add display_name and compatibility trigger; private service-role token table with explicit grants and RLS, no client policies.
- `src/test/apple-profile.test.ts`: concrete tests for Apple/email name rules, name preservation, hydration ordering, revocation-before-deletion and revocation failure.
- `AGENTS.md`, `roadmap.md`: architecture and remaining verification blockers.

## Identity and information audit

Native sign-in passes an Apple identity token to the auth service, not an email. Token exchange verifies Apple's signed `sub` matches the authenticated user's Apple identity. App data remains keyed by the auth UUID derived from that identity. No client code finds Apple accounts by email or requires the real email. Hosted automatic identity linking behavior remains unverified; no hosted auth settings were changed.

Apple onboarding no longer asks for a name. The Profile tab still offers optional name editing, as requested. Birthday, optional gender, interests, love languages, avatar and home city are not supplied by Apple and remain unchanged. Email/password signup fields are not required by the Apple button flow.

## Hide My Email delivery

This app currently sends through Lovable managed email, not Resend. Auth and transactional code both use visible sender `noreply@teeneffort.app` and verified sender domain `notify.teeneffort.app`. The email-domain status read confirmed the domain is verified and auth email is enabled; this does not prove delivery to an Apple relay mailbox.

In Apple Developer > Certificates, Identifiers & Profiles > More > Sign in with Apple > Email Sources, register the sending domain/address sources: `teeneffort.app`, `noreply@teeneffort.app` and `notify.teeneffort.app` as applicable to the visible From and envelope sender. Check Apple's SPF validation and the sender's authenticated SPF/DKIM alignment. Do not change the existing delegated email DNS just to use Resend. If you separately send through Resend, register its actual From/envelope sources too, on a separately verified sending domain where needed.

Apple source registration and a real Hide My Email delivery test are pending your access and confirmation. References: https://developer.apple.com/help/account/capabilities/configure-private-email-relay-service/ and https://developer.apple.com/documentation/signinwithapple/communicating-using-the-private-email-relay-service

## Verification limits

Automated tests exercise local rules with mock inputs only. No Apple credentials, live authorization, token exchange, revocation or destructive account test is used until you confirm. iPhone behavior requires rebuilding with the established ios:sync workflow and testing on your device.