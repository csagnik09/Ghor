# ঘর

A home dashboard with a clock, weather, calendar, alarms and smart switches, plus two apps that run from the same server:

| Address | App | What it does |
|---|---|---|
| `/` | **ঘর** | The dashboard. সুর and ছবি are tiles under **Apps**, showing how many songs and videos each has. |
| `/sur/` | **সুর** | Music player for the files in the `music` folder. |
| `/chobi/` | **ছবি** | Movies and shows from the `movies` folder, with resume, My List and subtitles. |

One command starts everything, on one port. No npm packages to install.

## 1. Install what it needs

**Node.js 18 or newer** from [nodejs.org](https://nodejs.org).

**ffmpeg** (recommended, for ছবি). With it, ছবি makes thumbnails and converts MKV, HEVC (H.265) and AC3/DTS files while you watch. Without it, only MP4 and WebM files with browser-friendly codecs play. সুর doesn't need it.

| System | Command |
|---|---|
| Windows | `winget install Gyan.FFmpeg` (then open a new terminal) |
| macOS | `brew install ffmpeg` |
| Ubuntu / Debian | `sudo apt install ffmpeg` |

## 2. Add your files

```
ghor/
├─ music/                       ← songs for সুর (any layout, e.g. Artist/Album/01 - Song.mp3)
└─ movies/                      ← videos for ছবি
    ├─ Inception (2010).mkv
    ├─ Pather Panchali (1955)/
    │   ├─ Pather Panchali (1955).mp4
    │   └─ Pather Panchali (1955).srt
    └─ Panchayat/
        └─ Season 1/
            └─ Panchayat S01E01.mkv
```

Both folders are watched while the server runs: সুর checks every 30 seconds, ছবি within a few seconds.

## 3. Start it

Open a terminal in this folder and run:

```
npm start
```

It prints the addresses to open:

```
  Open       http://localhost:8080
             http://192.168.1.20:8080   (phones, TVs and other computers on your Wi-Fi)
```

Open the second address on a phone, tablet or TV. Tap a tile to go into সুর or ছবি; the house button (or the logo) in the app's top bar brings you back to ঘর. Press `Ctrl+C` to stop.

## Settings

Set these as environment variables before `npm start`.

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `8080` | Port for everything |
| `HOST` | `0.0.0.0` | Use `127.0.0.1` to allow only this computer |
| `MUSIC_DIR` | `./music` | সুর's music folder |
| `SCAN_INTERVAL` | `30` | Seconds between সুর's folder checks |
| `MOVIES_DIR` | `./movies` | ছবি's library folder |
| `HWACCEL` | `auto` | ছবি encoder: `nvenc`, `qsv`, `amf`, `videotoolbox` or `cpu` |
| `MAX_HEIGHT` | `1080` | Height limit when ছবি re-encodes |
| `MAX_TRANSCODES` | `3` | Conversions allowed at once |
| `DIRECT_HEVC` | off | `1` sends HEVC as it is (only if every device can decode it) |

```
# macOS / Linux
MUSIC_DIR="/Volumes/Media/Music" MOVIES_DIR="/Volumes/Media/Movies" npm start

# Windows PowerShell
$env:MUSIC_DIR="D:\Music"; $env:MOVIES_DIR="D:\Movies"; npm start
```

## Files

- `server.js` – the one server: routes `/`, `/sur/`, `/chobi/` and `/api/status`
- `lib/sur.js`, `lib/tags.js` – music scanning, tags, covers, streaming
- `lib/chobi.js` – video scanning, ffmpeg conversion, thumbnails, subtitles
- `public/ghor`, `public/sur`, `public/chobi` – the three front ends
- `.cache/` – thumbnails, covers and file details. Safe to delete; it is rebuilt.
- `data/chobi.json` – ছবি's watch progress and My List. To keep history from the old standalone ছবি, copy its `data.json` here under this name.

## Where things are saved

- **ঘর**: settings, calendar events and alarms are in each browser's storage, so a wall tablet and your phone each have their own.
- **সুর**: likes and playlists are in each browser's storage.
- **ছবি**: progress and My List are on the server, shared by every device.

## Good to know

- **Privacy:** anyone on your Wi-Fi who knows the address can use all three apps. There are no accounts. Don't expose the port to the internet without a login in front of it.
- **Firewall:** on Windows, allow Node.js on private networks when asked, or other devices won't connect.
- **Other apps:** you can still add tiles for anything else in ঘর's Settings, with a full address such as `http://mac-mini.local:8096`.
