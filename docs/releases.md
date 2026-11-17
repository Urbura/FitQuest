# Saves, installation, and releases

## Save compatibility

Progress lives in browser localStorage under `fitville-v1`. `js/storage.js` validates imports and startup data; `js/save-manager.js` coordinates writes, recovery, and conflicts between tabs. Keep the storage key, developer-session keys, and skill array positions unchanged. Legacy fields such as `coins`, `bank`, `last`, `tier`, and recorded `rates` remain necessary for older backups. Introduce an explicit migration before removing or reinterpreting them.

Developer Mode backs up the normal profile and pauses normal writes. Restore Original Save or Exit Developer Mode returns that profile. The optional `legendCelebrated` marker prevents replaying the final reveal. Both device save slots preserve these fields.

## Installation and offline access

Open the app online and wait for Settings to show **Available offline on this device**. Use the supported browser's installation option, or Safari → Share → Add to Home Screen on iPhone. Browser menus and storage sharing vary; local saves are limited to the current browser or installed app. Installation does not provide cloud synchronization. Clearing site data or browser eviction may remove progress and cached files; local Save/Load does not protect against clearing site data.

The manifest and service worker use relative paths for GitHub Pages project hosting. `sw.js` precaches the app HTML, versioned scripts/CSS, manifest, and local artwork. An incomplete installation does not activate a partial release. Updates wait for existing windows to close, avoiding mixed app versions. The worker removes only old FitQuest caches and does not modify progress storage.

## Release checklist

1. Run syntax checks and all tests as described in [Development](development.md).
2. Update version queries in `index.html` and the matching entries in `sw.js` whenever scripts or CSS change. Update other referencing modules when their asset URLs change.
3. Add new runtime files to `APP_FILES` in `sw.js`, and bump `CACHE_NAME` for every release changing cached content.
4. Verify normal and Developer Mode screens, small portrait/landscape layouts, check-ins, corrections, dialogs, Save/Load previews, reset preservation of Manual Save, and recovery on target devices.
5. Verify online installation, offline reopening, and an update with an existing saved profile.

The single workflow `.github/workflows/deploy-pages.yml` checks every branch push, pull requests targeting `main`, and manual runs. Only successful runs on `main` deploy. After deployment, open FitQuest online to fetch the update, close all FitQuest windows, and reopen. Automated cache tests simulate browser APIs; real-device validation is still needed.

## Save / Load

Settings → Save keeps a separate `fitville-v1-manual` checkpoint with app/version metadata and its saved timestamp. Load previews Last Autosave and Manual Save with Total Level, rank, five skill levels, and the saved date. Loading is explicit and checks the selected slot has not changed since it was shown. Reset Progress preserves Manual Save.

Verified autosaves preserve the previous valid copy under `fitville-v1-backup`. If the main save is damaged or missing, display the valid recovery copy and pause automatic writes. Save that recovered profile manually and Load → Manual Save to resume. Main and manual writes are read back before reporting success. Developer previews cannot replace normal slots.
