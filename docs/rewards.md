# Rewards and visual assets

## Nearby achievements

Collections shows a collapsed **Achievements in reach** disclosure with up to three locked level achievements. Candidates are within three levels of their target and sorted by remaining levels, then name. The list shows each requirement and distance; completed achievements are excluded. If none qualify, an empty-state message explains the three-level threshold.

## Rank background scenery

`themeArtwork` in `js/config.js` maps each existing theme key to a local SVG scene. `themes` supplies a translucent centre overlay for text contrast; `renderHUD()` combines the overlay and scene. Milestone IDs, levels, and theme keys remain compatible with previous saves. Scenery gains rays, laurels, crystals, stars, and gold architecture at higher ranks. The base sky theme stays simple. Regenerate the scenes with `python scripts/generate-backgrounds.py`; when adding scenes, add them to `APP_FILES` in `sw.js` and bump its cache version. Offline tests verify that all configured scenes are cached.

## FitQuest Legend

The hidden `fitquest-legend` achievement requires every other registered achievement, including the hidden all-skills mastery medal. Completionist entries are excluded from their own requirement to avoid circular evaluation. Five for Five requires its first medal, rather than an unlimited repeat count. Legend enters Collections only when earned, uses `assets/icons/achievement-legend.png`, and triggers a dedicated gold-and-blue badge reveal with extended fireworks. The saved `legendCelebrated` flag prevents repeat celebrations after reopening or restoring the same save. Developer previews never set that flag. Existing qualifying profiles receive the reveal on their next normal render.

## Five for Five

The medal appears as a Collections toolbar counter. Opening it shows active skill check-in bonuses and progress toward the next automatic +5 XP reward for every skill. Rewards are paid once per set of five medals; paid milestones are preserved when ratings are corrected.

## Secret rewards

All Skills Level 50 and FitQuest Legend are excluded from locked rows, nearby previews, and visible achievement totals until earned. Keep their existing IDs when changing artwork or presentation.
