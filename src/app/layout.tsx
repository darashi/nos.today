import { AppProvider } from "@/lib/App";
import "./globals.css";
import Navbar from "./Navbar";

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
		/* biome-ignore lint/a11y/useHtmlLang: the language varies depending on the search */
		<html>
			<AppProvider>
				<body>
					<Navbar />
					{children}
				</body>
			</AppProvider>
		</html>
	);
}
