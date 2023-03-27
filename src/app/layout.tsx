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
    <html lang="en" data-theme="night">
      <body>{children}</body>
    </html>
  );
}
