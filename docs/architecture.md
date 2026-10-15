# Architecture

## Files

| File | Responsibility |
| --- | --- |
| `index.html` | Page structure, dialog containers, developer controls, and script order |
| `js/config.js` | Editable skills, titles, colours, progression settings, rewards, backgrounds, and reset settings |
| `js/progression.js` | Pure XP, level, bonus, Total Level, and reward-selection calculations |
| `js/storage.js` | Reads and validates saved progress, including compatibility with older check-in history |
| `manifest.webmanifest` | Installation name, scope, display mode, and app icons |
| `sw.js` | Versioned offline app cache and update lifecycle |
| `js/celebrations.js` | Rank and Total Level celebration markup |
| `js/pwa.js` | Installation prompt, offline readiness, and Settings help |
| `js/save-manager.js` | Browser save loading/writing, recovery protection, and synchronization between tabs |
| `js/developer.js` | Developer preview controls, session backups, and restoring original progress |
| `js/intro.js` | Welcome and practice screens |
| `js/achievements.js` | Achievement tracking and collection screens |
| `js/screens.js` | Pure dashboard, Settings, Journey, rank list, and Total Level markup |
| `js/fitville.js` | App state, action coordination, dialogs, celebrations, and browser events |
| `css/fitville.css` | Component styles with consolidated selectors; one block per responsive condition at the end |
| `assets/icons/` | Icons, achievement artwork, and licences |
| `assets/backgrounds/` | Rank scenery |
| `assets/app/` | App icon source and installation icons |
| `scripts/` | Reproducible SVG artwork generators |
| `docs/` | Architecture, editing, rewards, and release guidance |
| `tests/screens.test.cjs` | Pure screen rendering and display states |
| `tests/tracker.test.cjs` | Progression, check-ins, corrections, quests, and save validation |
| `tests/achievements.test.cjs` | Achievement unlocks, notifications, and collection rendering |
| `tests/celebrations.test.cjs` | Rank badge reveals and first Total Level celebration |
| `tests/pwa.test.cjs` | Manifest, icon dimensions, cache coverage, offline requests, and cache cleanup |
| `tests/save-manager.test.cjs` | Save writes, recovery, conflicts between tabs, and blocked device storage |
| `tests/developer.test.cjs` | Developer session backups, restore/exit, and blocked session storage |
| `.github/workflows/deploy-pages.yml` | Runs checks, then deploys GitHub Pages |

The older `fitville` filenames remain valid and are intentional. Visible app branding is FitQuest.

To understand saves: start with `js/storage.js` for **reading and checking** saved data. The browser storage key (`fitville-v1`) remains in `js/fitville.js`; loading, writing, and synchronization live in `js/save-manager.js`. The main coordinator responds to save outcomes by updating dialogs and notices. Do not rename the key or reorder the skills array: either change could disconnect existing progress.

Screen functions accept values and return HTML. They do not read browser storage or mutate app state. The main coordinator assembles inputs and handles user actions. Achievement and tutorial rendering remain in their dedicated modules.
