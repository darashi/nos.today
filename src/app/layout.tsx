import { AppProvider } from "@/lib/App";
import "./globals.css";

export const metadata = {
  title: "nos.today",
  description: "nos.today",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <AppProvider>
        <body>{children}</body>
      </AppProvider>
    </html>
  );
}
