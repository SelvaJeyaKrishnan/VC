import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OneGuest Studio | Remote Creator Recording Studio",
  description: "A private remote recording studio built for creator interviews, podcasts, and executive conversations.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0c0d12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0c0d12] text-slate-100 antialiased selection:bg-purple-500/20 selection:text-purple-200">
        {children}
      </body>
    </html>
  );
}
