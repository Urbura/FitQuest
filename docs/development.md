# Development

## Where to edit

Start with **js/config.js** for names, titles, rewards, colours, or balancing. Scripts load in this order: `config.js`, `progression.js`, `storage.js`, `intro.js`, `achievements.js`, `save-manager.js`, `developer.js`, `celebrations.js`, `screens.js`, `pwa.js`, then `fitville.js`.

### Change a reward title

Find the entry in `totalRewards` and edit its `title`:

```js
{ level: 25, title: 'Silver', theme: 'rose', themeName: 'Silver Horizon' }
```

The header, next-reward message, and celebration all use this entry.

### Change a background

`themeArtwork` maps theme keys to local background assets. The Beginner (`sky`) theme uses the approved anime attic image `assets/backgrounds/beginner-attic-v1.webp`; other ranks retain their SVG scenes. The WebP is an optimized export of the approved artwork, with no content changes. `themes` supplies the translucent centre overlay for text contrast. Each `totalRewards` entry selects a theme and supplies its readable `themeName`. Keep milestone entries ordered by level. Regenerate scenery with `python scripts/generate-backgrounds.py`, and rank badges with `python scripts/generate-rank-badges.py`.

### Change skill information

Each entry in `skills` contains its name, hint, icon, colour, regular titles, mastery title, and crown details. Regular titles unlock every seven levels; the mastery title and crown unlock at the maximum skill level.

**Do not reorder, remove, or insert skills into the skills array.** Existing saves associate progress with each array position. Change `skillDisplayOrder` to rearrange the dashboard safely. Adding a sixth skill requires a save migration and updates to validation, layout, and tests; it is not a configuration-only edit.

### Progression settings

- `maxSkillLevel`: currently 50.
- `xp.firstLevelCost`: 5 XP to reach level 2.
- `xp.growthRate`: 1.029, matching WriteQuest. Each level costs `ceil(5 * 1.029 ** (level - 1))` XP.
- `bonusMilestones`: +1, +2, +3, and +4 XP at skill levels 10, 20, 30, and 40. The current save validator supports bonus values 0–4.
- Total Level is the sum of all five skill levels, ranging from 5–250.
- The central Daily Check-In stages all five ratings (unrated skills default to zero) until Save Today’s Check-In. Closing discards unsaved ratings. Skill buttons open progress details with a link to Daily Check-In. Saving writes the form once; failed writes restore the original in-memory progress and retain the draft to retry. Check-ins are limited to one per skill per reset day. Completed skills offer **Edit today’s rating** until the daily reset. Corrections replace the original XP contribution, retain the original bonus, and do not replay celebrations or increase participation counts. A zero rating earns zero XP; positive ratings receive the bonus earned by the skill level before that check-in.

Each skill needs 552 total XP to reach level 50. Consistent 3/5 daily ratings with milestone bonuses take 108 check-ins, matching WriteQuest. Daily quest XP and the Five for Five medal bonus can shorten that time. Existing XP and history stay unchanged; the faster curve can raise existing levels.

Changing the maximum level also requires checking title counts, Total Level reward milestones, developer input limits in `index.html`, and regression expectations.

### Reset settings

`dailyReset.utcHour` and `utcMinute` define the reset boundary; `label` is its display text. Keep the label consistent with the configured time. The current reset is fixed at 09:30 UTC: 03:30 CST (UTC−6) year-round. It does not follow daylight saving time.

## Checks

Use Node.js 22 or newer:

```sh
for file in js/*.js sw.js; do node --check "$file"; done
node --test tests/*.test.cjs
```

Tests cover progression, check-ins and corrections, save protection, achievements, reward markup, developer previews, and offline-cache coverage. Tracker integration tests use isolated browser mocks and a test hook before normal startup. They do not replace real browser or phone testing. Prefer direct tests for pure modules such as progression and screen rendering.

## Formatting

The repository uses two-space indentation and LF line endings, recorded in `.editorconfig`. Follow existing component and module boundaries. Avoid appending duplicate CSS overrides; edit the existing rule and responsive block. Preserve intentional `vh`/`dvh` fallbacks, safe-area padding, and touch-target sizes. No formatter dependency or build step is required.

## Developer reward previews

Developer Mode can replace preview history with up to 365 active days, a chosen longest streak, and a chosen Five for Five medal count. Counts must be whole numbers; streak/medal counts cannot exceed active days, and a non-empty history needs a streak of at least one day. Active history is generated from the current reset day, with separated older dates; weekly-best achievements use this generated history. Applying history does not award XP.

**Unlock All Achievements (Preview)** applies all Level 50 skills, 120 active days, a 30-day streak, and five perfect days, revealing the secret rewards in Collections. **Play reward celebrations** can replay any rank-up or FitQuest Legend on demand without changing the normal `legendCelebrated` marker. The test panel minimizes so the preview can be seen; reopen it from Test Mode. Restore Original Save or Exit Developer Mode returns the backed-up profile. Normal browser saves remain paused throughout previews.

## Developer home-screen icon

Open `?dev` (or `?test=1`) before choosing Add to Home Screen or Install. The head script `js/app-metadata.js` selects `manifest-dev.webmanifest`, the purple DEV icons, and the name FitQuest Dev. Its distinct manifest ID and `?dev` start URL identify the developer installation. Normal links retain the regular manifest and icons. Both installations share the existing origin and save key; Developer Mode protects the normal save rather than creating a separate account. The developer installation still requires physical-phone verification.

Developer Mode starts with its panel collapsed and a persistent Test Mode button in the header. Settings → Help → Open test tools is a second launcher. Both controls are hidden outside Developer Mode.
