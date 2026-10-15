# Saves, installation, and releases

## Save compatibility

Progress lives in browser localStorage under `fitville-v1`. `js/storage.js` validates imports and startup data; `js/save-manager.js` coordinates writes, recovery, and conflicts between tabs. Keep the storage key, developer-session keys, and skill array positions unchanged. Legacy fields such as `coins`, `bank`, `last`, `tier`, and recorded `rates` remain necessary for older backups. Introduce an explicit migration before removing or reinterpreting them.

Developer Mode backs up the normal profile and pauses normal writes. Restore Original Save or Exit Developer Mode returns that profile. The optional `legendCelebrated` marker prevents replaying the final reveal. Export/import preserves these fields.

## Installation and offline access

Open the app online and wait for Settings to show **Available offline on this device**. Use the supported browser's installation option, or Safari → Share → Add to Home Screen on iPhone. Browser menus and storage sharing vary; if an installed copy starts separately, transfer progress through export/import. Installation does not provide cloud synchronization. Clearing site data or browser eviction may remove progress and cached files; retain downloaded backups.

The manifest and service worker use relative paths for GitHub Pages project hosting. `sw.js` precaches the app HTML, versioned scripts/CSS, manifest, and local artwork. An incomplete installation does not activate a partial release. Updates wait for existing windows to close, avoiding mixed app versions. The worker removes only old FitQuest caches and does not modify progress storage.

## Release checklist

1. Run syntax checks and all tests as described in [Development](development.md).
2. Update version queries in `index.html` and the matching entries in `sw.js` whenever scripts or CSS change. Update other referencing modules when their asset URLs change.
3. Add new runtime files to `APP_FILES` in `sw.js`, and bump `CACHE_NAME` for every release changing cached content.
4. Verify normal and Developer Mode screens, small portrait/landscape layouts, check-ins, corrections, dialogs, and export/import on target devices.
5. Verify online installation, offline reopening, and an update with an existing saved profile.

The single workflow `.github/workflows/deploy-pages.yml` checks every branch push, pull requests targeting `main`, and manual runs. Only successful runs on `main` deploy. After deployment, open FitQuest online to fetch the update, close all FitQuest windows, and reopen. Automated cache tests simulate browser APIs; real-device validation is still needed.
