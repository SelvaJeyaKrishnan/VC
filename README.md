# OneGuest Studio

[![Next.js](https://img.shields.io/badge/Next.js-16.4.2-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.1-blue?logo=react)](https://react.dev/)
[![LiveKit](https://img.shields.io/badge/LiveKit-2.23.0-purple?logo=webrtc)](https://livekit.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Render Deploy](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render)](https://render.com/)
[![Tests](https://img.shields.io/badge/Tests-15%20Passed-brightgreen)](tests/)

**OneGuest Studio** is a private, high-fidelity remote recording and 1-on-1 interview platform inspired by Riverside's broadcast recording workflow. Built for creator interviews, executive deep-dives, and remote podcasts using **Next.js App Router (Turbopack)**, **React 19**, **LiveKit WebRTC**, **Tailwind CSS v4**, and custom **WebGL shader pipelines**.

---

## Key Features

### 1. Riverside-Inspired Studio & Workspace Dashboard
- **Creator Dashboard (`/`)**: Dark charcoal aesthetic (`#0c0d12`, `#141722`), quick-launch creator card, copyable guest invite links, guest code parser, session metrics, and live interview session deck.
- **Green Room Preflight (`/join` & `/host`)**: 7:5 two-column pre-studio console with real-time hardware stream preview, Web Audio API VU meter, device selectors (camera/mic/speaker with test sound chime), and acoustic headphone guidance.
- **Recording Stage (`/room/[roomId]`)**: Balanced 1-on-1 broadcast split screen and speaker focus views, real-time speaking indicators, role badges ("HOST" / "GUEST"), session duration counter, and WebRTC connection quality badges.
- **Docked Studio Toolbar**: Quick toggles for microphone, camera, screen sharing, layout switching, selfie enhancer drawer, host-controlled recording trigger, and room exit.

### 2. Real-Time Hardware-Accelerated Selfie Enhancement
- **Bilateral Skin Smoothing**: 9-tap bilateral WebGL shader kernel that softens facial skin while keeping eyes, eyebrows, and glasses sharp.
- **Skin Tone Detection (YCbCr)**: Targets natural human skin pigment ranges (`Cb ~ 0.43`, `Cr ~ 0.60`) to avoid blurring backgrounds or clothing.
- **Studio Lighting & 4500K Tone Curve**: Lifts under-eye shadows and diffuse ambient lighting with a warm 4500K ring-light curve and highlight protection.
- **Split-Screen Comparison Mode**: Live vertical dividing slider comparing raw camera input (left) against enhanced output (right).
- **WebRTC Pipeline Integration**: Operates as a native LiveKit `TrackProcessor<Track.Kind.Video>`, transmitting processed frames directly to the remote participant and capturing them into master recording files.

### 3. Local Multi-Track Recording Engine
- **Isolated Participant Recording**: Client-side recording at 1080p 3.5 Mbps video / 128 kbps Opus audio using browser `MediaRecorder`.
- **Synchronized Data Channel Signals**: Host-authorized recording triggers coordinated via LiveKit data channel broadcasts.
- **Chunked Upload Pipeline**: Recordings upload directly to `/api/recordings/upload` and are indexed in `data/recordings/<roomId>/manifest.json`.
- **Recordings Library**: In-app recording browser with track metadata, file sizes, embedded HTML5 `<video>` preview modal, and direct downloads.
- **Path Traversal Security**: Strict filename sanitization blocking directory escape attempts.

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
# Run all 15 unit tests
npm test

# Run TypeScript type-checking
npm run lint

# Build production bundle
npm run build
```

The test suite covers:
- **`tests/tokenService.test.mjs`**: Token validation, placeholder credential detection, and JWT grant signing.
- **`tests/selfieEnhancer.test.mjs`**: YCbCr skin tone detection math and shadow lift tone curve.
- **`tests/interviewStore.test.mjs`**: Session CRUD, room lookup, and passcode validation.
- **`tests/recordingStore.test.mjs`**: Multi-track persistence, manifest generation, and path traversal security.
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