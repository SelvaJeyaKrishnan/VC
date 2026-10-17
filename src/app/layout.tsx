import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

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
  themeColor: "#0a0b0e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${instrumentSans.variable}`}>
      <body className="min-h-screen bg-[#0a0b0e] text-[#f3f4f6] font-sans antialiased selection:bg-[#c0915a]/30 selection:text-[#fae8d4]">
        {children}
      </body>
    </html>
  );
}
