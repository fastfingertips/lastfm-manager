# Last.fm Manager

Premium library management tools for Last.fm — duplicate detection, metadata inspection, and more.

## Screenshots

| Scrobble Panel | Settings Panel |
|:---:|:---:|
| <img src="assets/scrobble_panel.png" width="300" alt="Scrobble Panel" /> | <img src="assets/scrobble_panel_settings.png" width="300" alt="Settings Panel" /> |

| Main Interface | System Preferences | About & Version |
|:---:|:---:|:---:|
| <img src="assets/page_scrobble_panel.png" width="200" alt="Main Panel" /> | <img src="assets/page_system.png" width="200" alt="System" /> | <img src="assets/page_about.png" width="200" alt="About" /> |

## Features

- **Duplicate Detection** — Fuzzy matching with configurable time tolerance
- **Metadata Inspector** — View scrobble details with streaming links
- **Bulk Actions** — Select and delete multiple scrobbles
- **Settings Portability** — Export/import as JSON
- **Safety Levels** — Configurable delete confirmation

## Structure

```
src/
├── shared/     # Config, design tokens
├── content/    # Page injection scripts & styles
└── popup/      # Extension popup UI
assets/         # Screenshots and media
```

## Install

1. Clone repo
2. Chrome → `chrome://extensions` → Developer mode
3. Load unpacked → select folder
4. Go to [Last.fm Library](https://www.last.fm/user/_/library)

## License

MIT

