import type React from "react";
import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/toaster";
import localFont from "next/font/local";
import { AccountProvider } from "@/components/account-provider";

// 定义 NotoSansSC 字体
const notoSansSC = localFont({
  src: "../public/NotoSansSC-Medium.ttf",
  variable: "--font-noto-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "简历生成器",
  description: "在线简历编辑与生成工具",
  generator: "magicyan418",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={notoSansSC.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <style>{`
html {
  font-family: var(--font-noto-sans), sans-serif;
  --font-sans: var(--font-noto-sans);
  --font-mono: ${GeistMono.variable};
}
        `}</style>
        <link rel="stylesheet" href="/styles/print-resume.css" media="print" />
      </head>
      <body className={notoSansSC.className}>
        <AccountProvider>{children}</AccountProvider>
        <Toaster />
      </body>
    </html>
  );
}
