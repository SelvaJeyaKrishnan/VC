export const dynamic = "force-dynamic";

export async function GET() {
  const isLiveKitConfigured = Boolean(
    process.env.LIVEKIT_URL &&
    process.env.LIVEKIT_API_KEY &&
    process.env.LIVEKIT_API_SECRET &&
    !process.env.LIVEKIT_URL.includes("your-project") &&
    !process.env.LIVEKIT_API_KEY.includes("devkey")
  );

  return Response.json({
    status: "ok",
    service: "oneguest-studio",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    livekitConfigured: isLiveKitConfigured,
  });
}
