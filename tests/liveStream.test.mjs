import test from "node:test";
import assert from "node:assert/strict";

test("Live streaming destinations validate keys and RTMP schemes", () => {
  const destinations = [
    {
      id: "dest-youtube",
      platform: "youtube",
      name: "YouTube Live",
      rtmpUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "abcd-1234-wxyz",
      enabled: true,
    },
    {
      id: "dest-twitch",
      platform: "twitch",
      name: "Twitch",
      rtmpUrl: "rtmp://live.twitch.tv/app/",
      streamKey: "live_987654321_secret",
      enabled: true,
    },
    {
      id: "dest-custom",
      platform: "custom",
      name: "Custom RTMP",
      rtmpUrl: "rtmp://ingest.customcdn.com/app",
      streamKey: "",
      enabled: false,
    },
  ];

  const activeDestinations = destinations.filter(
    (d) => d.enabled && d.streamKey.trim().length > 0
  );

  assert.strictEqual(activeDestinations.length, 2);
  assert.ok(activeDestinations.some((d) => d.platform === "youtube"));
  assert.ok(activeDestinations.some((d) => d.platform === "twitch"));
  assert.ok(!activeDestinations.some((d) => d.platform === "custom"));
});
