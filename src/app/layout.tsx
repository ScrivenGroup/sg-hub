import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { UiLoadingProvider } from "@/core/shell/UiLoading";
import { standardsKitAttrs } from "@/modules/standards/catalog";
import { getStandardsChoices } from "@/core/store/json-store";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Scriven Group",
  description: "ScrivenGroup hub — organise and build",
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const kit = standardsKitAttrs(await getStandardsChoices());
  return (
    <html lang="en" {...kit}>
      <body className={`${manrope.variable} antialiased`} style={{ fontFamily: "var(--font-manrope), var(--font-sans)" }}>
        <UiLoadingProvider>{children}</UiLoadingProvider>
      </body>
    </html>
  );
}
