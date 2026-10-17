# OneGuest Studio

[![Next.js](https://img.shields.io/badge/Next.js-16.4.2-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.1-blue?logo=react)](https://react.dev/)
[![LiveKit](https://img.shields.io/badge/LiveKit-2.23.0-purple?logo=webrtc)](https://livekit.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Render Deploy](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render)](https://render.com/)
[![Tests](https://img.shields.io/badge/Tests-26%20Passed-brightgreen)](tests/)

**OneGuest Studio** is a private, high-fidelity remote recording and 1-on-1 interview platform inspired by Riverside's core broadcast workflow. Purpose-built exclusively for creator interviews, remote podcasts, and executive conversations, OneGuest Studio delivers **4 isolated, uncompressed stems** per interview (Host Video, Host Audio, Guest Video, Guest Audio) alongside an in-studio script teleprompter and zero-account guest onboarding.

---

## Key Features

### 1. Riverside-Inspired 4-Tab Workspace & Navigation
- **Dashboard**: High-level studio overview, quick-launch studio card, quick guest link parser, recent interview cards with video thumbnail headers, and dual Host/Guest avatar badges.
- **Interviews**: Complete interview manager with search, filter tabs (*All*, *Scheduled*, *Active*, *Completed*), unique guest invitation links, private passcode support, and one-click studio entry.
- **Recordings Library**: Comprehensive participant track cards grouping Host stems (Video 1080p + Audio 48kHz Opus) and Guest stems (Video 1080p + Audio 48kHz Opus), raw audio & video playback modals, single-stem downloads, and a master *"Download All Separate Tracks"* batch exporter.
- **Settings & Privacy**: Local audio/video hardware test suite, 4-stem multi-track architecture diagrams, disk storage path configuration (`RECORDINGS_STORAGE_PATH`), and guest privacy specifications.

### 2. Critical Requirement: Isolated 4-Stem Recording Engine
The platform solves the common single-track bug by capturing four independent media streams simultaneously:
1. **Host Video (1080p)**: Pristine local camera stream recorded via `MediaRecorder` with VP9/H.264 codecs.
2. **Host Audio (48kHz)**: Isolated host microphone stream with zero guest bleed.
3. **Guest Video (1080p)**: Subscribed remote WebRTC track captured directly from guest publication.
4. **Guest Audio (48kHz)**: Dedicated remote guest microphone stream (Opus/WAV) ready for DaVinci Resolve or Premiere.
5. **Bonus Composite (720p/1080p)**: Synchronized side-by-side split screen for quick social media clips or archival preview.
- **Pre-Flight Safety Guard**: Warns the host and blocks silent partial recording if the guest has not connected or their tracks are muted.
- **Progressive Upload & Verification**: Uploads chunks to `/api/recordings/upload` and physically verifies files on disk before marking sessions as complete.
- **Tab Exit Protection**: `beforeunload` warning prevents accidental browser closure during active recording or upload.

### 3. In-Studio Teleprompter & Notes Overlay
- **Floating Script Drawer**: Auto-scrolling teleprompter embedded directly in the studio stage.
- **Customizable Pace**: Play/Pause controls with variable scrolling speed (`1x` to `5x`) and adjustable font sizes (`14px` to `24px`).
- **Auto-Persistence**: Script and interview talking points automatically sync to browser `localStorage` per room ID.

### 4. Zero-Account Guest Joining & Green Room
- **Direct Link Onboarding (`/join?code=og-xxx`)**: Guests join via private invite link with zero account creation or payment barriers.
- **Green Room Pre-Flight**: Live camera preview, real-time Web Audio API VU meter, device selectors with test sound chimes, and headphone advisory.
- **Server-Side Token Security**: LiveKit tokens minted securely on-demand via server-side API; secrets are never leaked in client links.

---

## Tech Stack & Architecture

- **Framework**: Next.js 16.4.2 (App Router with Turbopack)
- **UI Library**: React 19.3.1
- **Styling**: Tailwind CSS v4 & Lucide React Icons
- **Real-Time WebRTC**: `@livekit/components-react` (2.9.24) & `livekit-client` (2.23.0)
- **Server Token SDK**: `livekit-server-sdk` (2.19.1)
- **Video Processing**: Custom WebGL Shader Pipeline implementing `TrackProcessor`
- **Testing**: Native Node.js test runner (`node --test`)
- **Deployment Platform**: Render (Web Service via `render.yaml`)

---

## Getting Started

### 1. Prerequisites
- Node.js `>= 20.9.0` (Node 22 LTS recommended)
- A free [LiveKit Cloud Account](https://cloud.livekit.io) (or self-hosted LiveKit server)

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/SelvaJeyaKrishnan/VC.git
cd VC
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
# LiveKit Cloud Credentials (from https://cloud.livekit.io)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# Optional Base URL for absolute guest invite links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Quality Assurance

Run the automated test suite:
```bash
# Run all 26 unit and E2E simulation tests
npm test

# Run TypeScript type-checking
npm run lint

# Build production bundle
npm run build
```

The test suite covers:
- **`tests/recordingEndToEnd.test.mjs`**: End-to-end multi-participant studio recording simulation, 4-stem isolation verification, and missing guest safety pre-flight check.
- **`tests/recordingEngine.test.mjs`**: Codec negotiation (WebM VP9/Opus & MP4), track readiness validator, and participant search logic.
- **`tests/recordingStore.test.mjs`**: Multi-track persistence, manifest generation, 4-stem physical verification, and path traversal security.
- **`tests/guestFlow.test.mjs`**: URL/code parser for guest links and credential leakage prevention.
- **`tests/tokenService.test.mjs`**: Token validation, placeholder credential detection, and JWT grant signing.
- **`tests/selfieEnhancer.test.mjs`**: YCbCr skin tone detection math and shadow lift tone curve.
- **`tests/interviewStore.test.mjs`**: Session CRUD, room lookup, and passcode validation.
- **`tests/health.test.mjs`**: Render deployment monitoring endpoint schema and status.
- **`tests/utils.test.mjs`**: ID generators, guest codes, initials, and Tailwind merging.

---

## Deploying to Render

This repository includes a [`render.yaml`](render.yaml) Blueprint configuration for 1-click Render Web Service deployment.

### Quick Setup:
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Web Service** (or **Blueprint** to load `render.yaml`).
3. Select your GitHub repository: `SelvaJeyaKrishnan/VC`.
4. Configure the environment variables in Render:
   - `LIVEKIT_URL`: `wss://<your-project>.livekit.cloud`
   - `LIVEKIT_API_KEY`: `<your_livekit_api_key>`
   - `LIVEKIT_API_SECRET`: `<your_livekit_api_secret>`
   - `NODE_VERSION`: `22.14.0`
5. Click **Deploy Web Service**.

Render will automatically install dependencies, compile with Turbopack, verify `/api/health`, and launch your live studio on an HTTPS `.onrender.com` domain!

---

## License

MIT License. See [LICENSE](LICENSE) for details.