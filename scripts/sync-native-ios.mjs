// Copies the widget/native files from native-ios/ into the Xcode project in ios/
// and fixes the storyboard so the widget connector is registered.
// Run with: npm run ios:sync
import { copyFileSync, existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";

const root = "ios/App";
if (!existsSync(root)) {
  console.error("No ios/ folder found. Run `npx cap add ios` first.");
  process.exit(1);
}

const copies = [
  ["native-ios/App/MainViewController.swift", `${root}/MainViewController.swift`],
  ["native-ios/App/WidgetDataPlugin.swift", `${root}/App/WidgetDataPlugin.swift`],
  ["native-ios/TeenEffortWidget/TeenEffortWidget.swift", `${root}/TeenEffortWidget/TeenEffortWidget.swift`],
];
for (const [from, to] of copies) {
  copyFileSync(from, to);
  console.log(`Updated ${to}`);
}

const oldObjC = `${root}/App/WidgetDataPlugin.m`;
if (existsSync(oldObjC)) {
  rmSync(oldObjC);
  console.log(`Removed old ${oldObjC}`);
}

const storyboard = `${root}/App/Base.lproj/Main.storyboard`;
const sb = readFileSync(storyboard, "utf8");
const fixed = sb.replace(
  /customClass="CAPBridgeViewController" customModule="Capacitor"/,
  'customClass="MainViewController" customModule="App" customModuleProvider="target"',
);
if (fixed !== sb) {
  writeFileSync(storyboard, fixed);
  console.log("Main.storyboard now uses MainViewController");
}
console.log("iOS native files are up to date.");
