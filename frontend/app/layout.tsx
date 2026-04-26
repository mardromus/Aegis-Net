import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { TopNav } from "@/components/shell/TopNav";
import { CommandPalette } from "@/components/shell/CommandPalette";

export const metadata: Metadata = {
  title: "Aegis-Net — A Reasoning Atlas of Indian Healthcare",
  description:
    "An evidence-grounded, citation-anchored audit of 10,000 medical facilities across India, plus a hexagonal mathematics of medical deserts.",
  metadataBase: new URL("http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <TopNav />
        <CommandPalette />
        <main className="pt-[76px]">{children}</main>
        <Toaster
          theme="light"
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "!bg-paper !border !border-ink !text-ink !rounded-none !shadow-letterpressSm",
            },
          }}
        />
      </body>
    </html>
  );
}
