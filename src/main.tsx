import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./app/globals.css";
import App from "./App";

const container = document.getElementById("root");

if (!container) {
	throw new Error("Root container not found");
}

createRoot(container).render(
	<StrictMode>
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</StrictMode>,
);
