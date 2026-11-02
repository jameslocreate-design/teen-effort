# Apple sign-in review compliance
- [ ] Preserve first-authorization names before onboarding and skip required Apple name entry.
- [ ] Store Apple tokens privately and revoke before account deletion.
- [ ] Audit official button, identity handling and private email relay; provide final code report.
- [ ] Verify Apple sign-in/deletion on device — requires Apple credentials and user confirmation before testing.

# Date suggestion variety
- [x] Finish and test recent-venue exclusion across the shared generation flow (19 targeted tests passed).
- [x] Deploy the updated date generation function.
- [ ] Verify consecutive Columbus generations on the authorized deployed app — Google Maps live checks are unavailable in the agent sandbox.

# Public page access
- [x] Separate the public web homepage from signup and app entry, preserving native entry.
- [x] Keep birthday verification in signup and app entry, and verify public pages remain accessible.

# Search engine verification
- [x] Add the Google site verification meta tag to the shared page head on every page.
- [ ] Confirm the tag is served at teeneffort.app after the next publish.

# iPhone widgets and nearby dates
- [x] Add home-screen and lock-screen distance and date-streak widgets.
- [x] Create editable preparation checklists for planned dates and share the next one with an iPhone widget.
- [x] Prevent out-of-area AI venues and verify the nearby-date rules.
- [x] Test shared widget data and checklist timing; document the iPhone rebuild.
- [ ] Verify physical iPhone widget rendering — requires the user's Xcode rebuild/device.
- [ ] Verify a real planned-date checklist end-to-end — requesting user's account has no accepted partner link/calendar dates.
- [ ] Verify successful live nearby suggestions — Google Maps live verification requires an authorized deployed origin.