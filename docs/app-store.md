# iOS packaging — preparation build

This branch prepares a bundled Capacitor 8 app, not a submitted or signed release.
The existing GitHub Pages app is unchanged. The provisional bundle identifier is
`ca.theprairiebison.fitquest`; confirm it before registering an app in Apple’s account.

## Open on a Mac

Install Node 22+ and Xcode 26+, then:

```sh
npm ci
npm test
npm run ios:sync
npm run ios:open
```

In Xcode select the App target, set your development team under Signing &
Capabilities, confirm the bundle identifier, and run on an iPhone. No signing
credentials are stored in this repository. Version starts at 1.0, build 1.
The app uses bundled assets rather than loading GitHub Pages. Browser installation
and service workers are replaced only inside the generated native bundle.
`dist` and copied Xcode web assets are generated, not checked in.

## Required device checks before TestFlight

- Cold launch in airplane mode; verify all screens, icons and reward celebrations.
- Make check-ins and quest changes, force quit, restart, then reboot the device:
  verify progress, correction limits, resets, streaks and rewards.
- Verify progress survives installation of a newer build over the old build.
- Test export to Files and import from Files. Current backup export uses a browser
  Blob download; WKWebView compatibility is unverified. Add a native file/share
  adapter if it fails. Do not release with a non-working recovery path.
- Import an existing browser backup. Safari and the native app have separate
  storage: browser progress does not migrate automatically.
- Test keyboard, safe areas, accessibility, small iPhone and landscape. If shipping
  to iPad, validate iPad layouts and prepare its screenshots too.
- Audit WKWebView localStorage durability before release. The current storage
  implementation is unchanged; native durable storage remains a release decision.

## Submission prerequisites — not completed by this branch

1. Apple Developer enrollment, signing team, and App Store Connect app record.
2. Public support URL/contact and a privacy policy linked in app Settings and the
   store listing. Confirm the developer identity and contact before publishing.
3. Audit app and Capacitor SDK privacy manifests and required-reason APIs in the
   actual Xcode archive. Complete App Privacy based on verified data practices;
   do not infer a final declaration from the absence of analytics alone.
4. Final icon review (the packaging icon is an opaque 1024px rendition of the
   existing FitQuest icon), screenshots from the actual app, description,
   subtitle, keywords, age rating, category and export-compliance answers.
5. Explain the app’s habit progression, offline interaction, quests and rewards
   in reviewer notes. Apple’s minimum-functionality review applies; using
   Capacitor does not guarantee acceptance.
6. Archive and validate in Xcode, upload to App Store Connect, and complete an
   on-device TestFlight trial before submitting for review.

Do not add credentials, provisioning profiles or private signing keys to git.
App deletion can remove local progress. Retain exported backups; no cloud sync
is provided by this packaging step.

## References

- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/ios
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
