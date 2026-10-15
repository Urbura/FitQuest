# FitQuest

FitQuest is a lightweight, mobile-friendly daily habit tracker. Users rate Sleep, Diet, Stretching, Cardio, and Strength from 0–5. Check-ins earn skill XP, unlock titles and backgrounds, and show weekly participation.

## Run locally

The app uses plain HTML, CSS, and JavaScript. No build step or npm packages are required.

1. Download or clone this repository.
2. Open a terminal in its folder.
3. Start a local web server:

```sh
python -m http.server 8000
```

4. Open http://localhost:8000 in your browser.

Use http://localhost:8000/?dev for developer mode. It previews skill and Total Levels without writing normal progress. The Total Level override is a visual preview independent of skill levels; use **Use Sum of Skill Levels** to return to the calculated total.

## File map

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
| `js/fitville.js` | Check-in coordination, save handling, UI rendering, celebrations, and browser events |
| `css/fitville.css` | Component styles with consolidated selectors; one block per responsive condition at the end |
| `assets/icons/` | Local SVG icons and their licensing information |
| `tests/tracker.test.cjs` | Progression, check-ins, corrections, quests, and save validation |
| `tests/achievements.test.cjs` | Achievement unlocks, notifications, and collection rendering |
| `tests/celebrations.test.cjs` | Rank badge reveals and first Total Level celebration |
| `tests/pwa.test.cjs` | Manifest, icon dimensions, cache coverage, offline requests, and cache cleanup |
| `tests/save-manager.test.cjs` | Save writes, recovery, conflicts between tabs, and blocked device storage |
| `tests/developer.test.cjs` | Developer session backups, restore/exit, and blocked session storage |
| `.github/workflows/deploy-pages.yml` | Runs checks, then deploys GitHub Pages |

The older `fitville` filenames remain valid and are intentional. Visible app branding is FitQuest.

To understand saves: start with `js/storage.js` for **reading and checking** saved data. The browser storage key (`fitville-v1`) remains in `js/fitville.js`; loading, writing, and synchronization live in `js/save-manager.js`. The main coordinator responds to save outcomes by updating dialogs and notices. Do not rename the key or reorder the skills array: either change could disconnect existing progress.

## Where to edit

Start with **js/config.js** for names, titles, rewards, colours, or balancing. Scripts load in this order: `config.js`, `progression.js`, `storage.js`, `intro.js`, `achievements.js`, `save-manager.js`, `developer.js`, `celebrations.js`, `pwa.js`, then `fitville.js`.

### Change a reward title

Find the entry in `totalRewards` and edit its `title`:

```js
{ level: 25, title: 'Silver', theme: 'rose', themeName: 'Rose' }
```

The header, next-reward message, and celebration all use this entry.

### Change a background

Edit its gradient in `themes`:

```js
rose: 'linear-gradient(145deg, #f7dce5, #fff1f5)'
```

To add a theme, give it a unique key in `themes`, then use that key in a reward's `theme`. Set `themeName` to the readable name shown in the popup. Keep reward entries sorted by increasing level.

### Change skill information

Each entry in `skills` contains its name, hint, icon, colour, regular titles, mastery title, and crown details. Regular titles unlock every seven levels; the mastery title and crown unlock at the maximum skill level.

**Do not reorder, remove, or insert skills into the skills array.** Existing saves associate progress with each array position. Change `skillDisplayOrder` to rearrange the dashboard safely. Adding a sixth skill requires a save migration and updates to validation, layout, and tests; it is not a configuration-only edit.

### Progression settings

- `maxSkillLevel`: currently 50.
- `xp.firstLevelCost`: 5 XP to reach level 2.
- `xp.costIncrease`: each subsequent level costs 1 additional XP.
- `bonusMilestones`: +1, +2, +3, and +4 XP at skill levels 10, 20, 30, and 40. The current save validator supports bonus values 0–4.
- Total Level is the sum of all five skill levels, ranging from 5–250.
- Check-ins are limited to one per skill per reset day. Completed skills offer **Edit today’s rating** until the daily reset. Corrections replace the original XP contribution, retain the original bonus, and do not replay celebrations or increase participation counts. A zero rating earns zero XP; positive ratings receive the bonus earned by the skill level before that check-in.

Each skill needs 1,421 total XP to reach level 50. Perfect daily check-ins with the current skill bonuses take 191 days when counting check-in XP alone. Daily quest XP and the Five for Five medal bonus can shorten that time. Changes to XP settings recalculate levels from existing saved XP; review that effect before deploying.

Changing the maximum level also requires checking title counts, Total Level reward milestones, developer input limits in `index.html`, and regression expectations.

### Reset settings

`dailyReset.utcHour` and `utcMinute` define the reset boundary; `label` is its display text. Keep the label consistent with the configured time. The current reset is fixed at 09:30 UTC: 03:30 CST (UTC−6) year-round. It does not follow daylight saving time.

## Run automated checks

Install Node.js 22 or newer, then run these commands from the repository folder:

```sh
node --check js/config.js
node --check js/progression.js
node --check js/storage.js
node --check js/intro.js
node --check js/achievements.js
node --check js/save-manager.js
node --check js/developer.js
node --check js/fitville.js
node --check js/celebrations.js
node --check js/pwa.js
node --check sw.js
node --test tests/*.test.cjs
```

Checks cover XP thresholds, Total Levels, rewards, duplicate check-ins, reset boundaries, weekly counts, bonus XP, completion messages, save validation, configuration consistency, achievement notifications, and developer backup/restore protection.

Progression tests import `createProgression(config)` from `js/progression.js` directly. Its functions do not depend on a browser, storage, or mutable tracker state. Inte
## Nearby achievements

Collections shows a collapsed **Achievements in reach** disclosure with up to three locked level achievements. Candidates are within three levels of their target and sorted by remaining levels, then name. The list shows each requirement and distance; completed achievements are excluded. If none qualify, an empty-state message explains the three-level threshold.

## Rank background scenery

`themeArtwork` in `js/config.js` maps each existing theme key to a local SVG scene. `themes` supplies a translucent centre overlay for text contrast; `renderHUD()` combines the overlay and scene. Milestone IDs, levels, and theme keys remain compatible with previous saves. Scenery gains rays, laurels, crystals, stars, and gold architecture at higher ranks. The base sky theme stays simple. Regenerate the scenes with `python scripts/generate-backgrounds.py`; when adding scenes, add them to `APP_FILES` in `sw.js` and bump its cache version. Offline tests verify that all configured scenes are cached.

## FitQuest Legend

The hidden `fitquest-legend` achievement requires every other registered achievement, including the hidden all-skills mastery medal. Completionist entries are excluded from their own requirement to avoid circular evaluation. Five for Five requires its first medal, rather than an unlimited repeat count. Legend enters Collections only when earned, uses `assets/icons/achievement-legend.png`, and triggers a dedicated gold-and-blue badge reveal with extended fireworks. The saved `legendCelebrated` flag prevents repeat celebrations after reopening or restoring the same save. Developer previews never set that flag. Existing qualifying profiles receive the reveal on their next normal render.
