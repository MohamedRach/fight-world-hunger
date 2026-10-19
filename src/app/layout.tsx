import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/navigation/AppHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Fight World Hunger",
    template: "%s · Fight World Hunger",
  },
  description:
    "Discover NGOs and donation campaigns working against hunger around the world, and follow where your donation goes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `dark` is always on: the app has a single dark identity, matching the
    // map. It also activates every `dark:` utility already used by the pages.
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
