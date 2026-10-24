# iOS relationship widgets

The existing extension includes Time Together, Partner Distance, Date Streak,
and Date Prep. Distance and streak support small home-screen and all three
lock-screen sizes. Date Prep supports medium home-screen, rectangular and
inline lock-screen sizes. Native code targets iOS 16.6 with guarded iOS 17 backgrounds.

## Updating the existing Xcode project

1. `git pull`
2. `npm install` and `npm run build`
3. `npm run ios:sync` (includes `npx cap sync ios` and automatic Swift/storyboard updates)
4. Open Xcode, Product → Clean Build Folder, then Run on the phone.
5. Open the app while signed in, then add the widgets from the home/lock-screen gallery.

No new Xcode target or manual file replacement is needed for the already configured project.
Both App and TeenEffortWidgetExtension must retain App Group `group.com.teeneffort.app`.
For a new Xcode project, the extension target and App Group still require initial setup.

## Data and limitations

- Partner distance is calculated from saved home cities, never live GPS.
- Date Streak mirrors the calendar's Monday–Sunday scheduled-date streak.
- Each planned date automatically has a personal checklist in the app. Defaults
  are 45 minutes getting ready, 20 minutes travel, and 10 minutes early arrival;
  users can edit estimates and tick tasks on that device. Travel is not live traffic.
- Date Prep shows the next upcoming date. Untimed dates have no invented schedule.
  Tapping it opens Calendar; checkboxes are edited in the app, not the widget.
- Preparation settings/completion stay on the device, separate for each account/date;
  they are not shared with the partner or other devices.
- The app syncs local widget snapshots on foreground, changes and realtime events.
  iOS controls actual refresh timing. Partner changes while the app is closed are
  picked up next time it opens; this is not background/live tracking.
- Snapshot data includes date titles/times/checklists and derived distance, but no
  GPS coordinates, account tokens or credentials. Logout/unlink clears snapshots.
- Swift compilation, signing, widgets and universal-link app opening must be verified
  in Xcode/on a physical iPhone; they cannot be compiled in the web sandbox.
