import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Discord AI Bot on Next.js",
  description:
    "A serverless Discord slash-command bot powered by Next.js, Vercel Workflow, and Anthropic on Amazon Bedrock.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
