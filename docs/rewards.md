# Rewards and visual assets

## Nearby achievements

Collections shows a collapsed **Achievements in reach** disclosure with up to three locked level achievements. Candidates are within three levels of their target and sorted by remaining levels, then name. The list shows each requirement and distance; completed achievements are excluded. If none qualify, an empty-state message explains the three-level threshold.

## Rank background scenery

`themeArtwork` in `js/config.js` maps each existing theme key to a local SVG scene. `themes` supplies a translucent centre overlay for text contrast; `renderHUD()` combines the overlay and scene. Milestone IDs, levels, and theme keys remain compatible with previous saves. Scenery gains rays, laurels, crystals, stars, and gold architecture at higher ranks. The base sky theme stays simple. Regenerate the scenes with `python scripts/generate-backgrounds.py`; when adding scenes, add them to `APP_FILES` in `sw.js` and bump its cache version. Offline tests verify that all configured scenes are cached.

## FitQuest Legend

The hidden `fitquest-legend` achievement requires every other registered achievement, including the hidden all-skills mastery medal. Completionist entries are excluded from their own requirement to avoid circular evaluation. The Well-Rounded Day achievements require 1, 5, and 25 perfect days. Previously earned Legend badges are retained. Legend enters Collections only when earned, uses `assets/icons/achievement-legend.png`, and triggers a dedicated gold-and-blue badge reveal with a brief, single fireworks burst. The saved `legendCelebrated` flag prevents repeat celebrations after reopening or restoring the same save. Developer previews never set that flag. Existing qualifying profiles receive the reveal on their next normal render.

## Well-Rounded Days

Optional achievements at 1, 5, and 25 days rated 5/5 in all five skills. These days need not be consecutive. Each milestone offers the standard one-time +3 XP to a chosen skill. There is no recurring +5 XP to all skills; existing XP and historical paid-milestone fields remain untouched. The first achievement retains `five-perfect-scores` and its previous claim marker. New milestones use `five-perfect-days-5` and `five-perfect-days-25`.

## Secret rewards

All Skills Level 50 and FitQuest Legend are excluded from locked rows, nearby previews, and visible achievement totals until earned. Keep their existing IDs when changing artwork or presentation.

The refined Legend badge keeps the crown, central star, one wing layer, and all five skill medallions. Its reveal uses a soft glow, a gentle scale-up, and one fireworks burst. Reduced-motion preferences disable these effects.

## Achievement XP

Every earned achievement offers one +3 XP reward in Collections, including achievements earned before this feature was added and the Well-Rounded Day milestones.

Choose any skill below Level 50. Later leaves the reward available; maxed skills are disabled. Claims store the achievement ID and chosen skill index in `achievementRewards`, written atomically with XP. Missing claim maps on older saves default to empty. Failed writes roll back the claim and XP. Rewards use the existing XP and level-up presentation and may unlock further achievements. Developer Mode rewards affect only the protected preview.

## Achievement display and celebrations

Collections highlights the most recent unlock and offers Clear all notifications. Clearing only acknowledges New markers; unclaimed XP stays available. Earned IDs and recent unlock order are saved alongside progress, preserving badges after rating corrections. Save/Load and explicit Reset restore their own snapshots.

New unlocks follow XP/level/rank feedback in the celebration queue. Each achievement popup offers Choose your +3 XP or Choose later. Claiming runs the shared XP animation and then resumes the remaining queue. Unlocked badges can be reopened from Collections; claimed rewards cannot be awarded again.
