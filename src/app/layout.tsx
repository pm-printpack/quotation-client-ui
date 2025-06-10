import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StoreProvider from "./StoreProvider";
import AuthGuard from "./AuthGuard";
import { Provider } from "@/components/ui/provider";
import Head from "next/head";
import { Theme } from "@chakra-ui/react";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quotation System",
  description: "Quotation System"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Head>
        <link rel="preload" href="https://www.popsci.com/wp-content/uploads/2024/04/26/fof-1.0-0856_inline-1.jpg?quality=85" as="image" />
      </Head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Provider>
          <StoreProvider>
            <AuthGuard>
              <Theme h="100vh" w="100vw" colorPalette="teal">
                {children}
                <Toaster />
              </Theme>
            </AuthGuard>
          </StoreProvider>
        </Provider>
      </body>
    </html>
  );
}
