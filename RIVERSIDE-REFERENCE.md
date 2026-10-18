# Riverside Reference Notes

## Publicly observed

These observations are limited to Riverside's public marketing site and Help Center as viewed on October 18, 2026. They are not a pixel specification for authenticated product screens.

- The public homepage uses a dark charcoal hero, large white sans-serif headline, compact wordmark/header, and violet primary action.
- The Help Center separates a dark search-and-topic hero from a light category area. Its recording categories cover session setup, joining, participant invitations and roles, media sharing, track uploads, livestreaming, and troubleshooting.
- The public article [How to Record Audio and Video Separately](https://riverside.com/blog/how-to-record-audio-and-video-separately) describes per-participant local audio/video tracks, device checks before joining, guest invitations, starting and stopping a recording, waiting for uploads, downloading raw/aligned tracks, and editing with a timeline, overlays, captions, scene layouts, and export.
- The public article [How to Record Separate Video Tracks](https://riverside.com/blog/how-to-record-separate-video-tracks) currently resolves to an article about recording separate tracks on Zoom; it is not evidence for Riverside's in-product layout.

## Not publicly verified

The authenticated dashboard, studio creation screens, green room, live studio, recording library, editor, export dialogs, settings, and integrations were not accessible without a Riverside account. Their exact navigation, spacing, colors, typography, and interaction states remain visually unverified. Help Center category descriptions establish workflows, not exact application layouts.

Do not describe OneGuest Studio's private product screens as pixel-matched based on this evidence. Use supplied authenticated screenshots or an authorized reference account for visual comparison before claiming parity. Keep the existing OneGuest branding and do not reuse Riverside logos, screenshots, or proprietary assets.

## Implementation checklist

- [ ] Preserve the existing Next.js/LiveKit application and verify four genuine participant-specific media files with two real browsers.
- [ ] Align authenticated screens only against accessible, authorized visual references; use Help Center articles for workflow behavior and label visual uncertainty.
- [ ] Keep AI features absent; retain only functional manual editing, media, and export controls.
- [ ] Replace ephemeral/local recording persistence with an explicitly configured durable store and verify restart recovery.
- [ ] Implement and test actual editing/export processing before exposing success or progress states.
- [ ] Run responsive browser checks and compare screenshots at matching viewport sizes; document unverified areas.
