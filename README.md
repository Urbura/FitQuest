# FitQuest

A lightweight, mobile-friendly habit RPG. Rate Sleep, Diet, Stretching, Cardio, and Strength to earn XP, ranks, and achievements. Supports home-screen installation and offline use after the initial download.

[Open FitQuest](https://urbura.github.io/FitQuest/) · [Developer Mode](https://urbura.github.io/FitQuest/?dev)

## Run locally

No build step or npm packages are required. From the repository folder:

```sh
python -m http.server 8000
```

Open <http://localhost:8000/>. Add `?dev` for protected test previews.

## Check changes

Use Node.js 22 or newer:

```sh
for file in js/*.js sw.js; do node --check "$file"; done
node --test tests/*.test.cjs
```

GitHub checks changes before deploying `main`.

## Find your way around

| Directory | Purpose |
| --- | --- |
| `js/` | Configuration, progression, saving, screens, and app coordination |
| `css/` | Component and responsive styles |
| `assets/` | Icons, backgrounds, installation artwork, and licences |
| `tests/` | Logic and integration regression tests |
| `scripts/` | Reproducible rank and background artwork generators |
| `docs/` | Developer and release guidance |

## Documentation

- [Architecture and file map](docs/architecture.md)
- [Editing, testing, and Developer Mode](docs/development.md)
- [Rewards and visual assets](docs/rewards.md)
- [Save compatibility, offline access, and releases](docs/releases.md)

Progress stays in the current browser. Export a backup before clearing browser data or moving devices. Preserve the `fitville-v1` storage key and skill array order when editing the code.
