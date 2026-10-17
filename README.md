# OneGuest Studio

**OneGuest Studio** is a private, premium dark-themed 1-on-1 recording studio built for creator interviews, podcasts, and executive conversations using **Next.js App Router**, **TypeScript**, **Tailwind CSS**, and the **LiveKit React SDK**.

Unlike generic video meeting software with crowded galleries and uninvited attendees, OneGuest Studio is purpose-built for an intimate host-and-single-guest dynamic.

---

## Milestone 1 Overview

- **Landing Page (`/`)**: Dark luxury studio interface with OneGuest branding, clear 1-on-1 positioning, and direct access points for Hosts and Guests.
- **Host Control Room (`/host`)**: Room configuration, room-code generator, one-click guest invite link copying, pre-flight checklist, and direct launch button.
- **Guest Join Portal (`/join`)**: Dedicated guest onboarding with room-code or full invite URL detection, pre-join display name configuration, and headphone audio guidelines.
- **LiveKit Video Room (`/room/[roomId]`)**:
  - Live 1-on-1 side-by-side broadcast split screen and speaker focus layouts.
  - Native microphone mute/unmute and camera toggle controls.
  - Connection status badge with real-time WebRTC states (`Connected`, `Connecting`, `Reconnecting`, `Disconnected`).
  - Graceful leave studio call handler.
  - Studio header with live session timer and room identifier.
  - Clear loading states and actionable error screens with environment setup prompts.
- **Responsive Layout**: Designed for laptop displays, tablets, and Android mobile browsers with touch-friendly controls.
- **Secure Server-side Token API (`/api/token`)**:
  - Signs LiveKit access tokens strictly on the server using `livekit-server-sdk`.
  - Reads `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` from server environment variables.
  - Never exposes `LIVEKIT_API_SECRET` to client-side code.
- **Milestone 2 Ready**: Architecture in place with `useStudioRecording` hook and `RecordingStatePlaceholder` types ready to attach local WebM/MP4 media taps in Milestone 2.

---

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# LiveKit Server or Cloud Credentials (from https://cloud.livekit.io)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# Optional Base URL for full invite links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 3. Production Build & Start
```bash
npm run build
npm run start
```

---

## Testing OneGuest Studio 1-on-1 Call

1. Open [http://localhost:3000/host](http://localhost:3000/host) and click **"Create & Enter Studio Room"**.
2. Click **"Copy Guest Link"** from the controls or top bar.
3. Open a second browser window (or incognito / mobile browser) and paste the guest link (e.g. `http://localhost:3000/join?room=...`).
4. Enter guest name and click **"Enter Studio as Guest"**.
5. Experience the real-time, low-latency 1-on-1 broadcast stage!
