import { Routes, Route } from "react-router-dom";
import { AppProvider } from "@/lib/App";
import Navbar from "./app/Navbar";
import HomePage from "./app/page";
import AboutPage from "./app/about/page";
import SearchPage from "./app/search/page";

export default function App() {
	return (
		<AppProvider>
			<div className="text-lg">
				<Navbar />
				<Routes>
					<Route path="/" element={<HomePage />} />
					<Route path="/about" element={<AboutPage />} />
					<Route path="/search" element={<SearchPage />} />
				</Routes>
			</div>
		</AppProvider>
	);
}
