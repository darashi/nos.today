"use client";

import { createRxNostr, RxNostr } from "rx-nostr";
import { verifier } from "rx-nostr-crypto";

import { createContext, useContext, useEffect, useState } from "react";
import { relays } from "./config";

type AppContext = {
	rxNostr: RxNostr;
	currentTime: Date;
};

const rxNostr = createRxNostr({
	verifier,
	connectionStrategy: "aggressive",
});
rxNostr.setDefaultRelays(relays);

export const App = createContext<AppContext>({
	rxNostr,
	currentTime: new Date(),
});

export function useApp() {
	return useContext(App);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
	const [currentTime, setCurrentTime] = useState(new Date());
	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentTime(new Date());
		}, 10_000);

		return () => {
			clearInterval(timer);
		};
	}, []);

	const ctx = {
		rxNostr,
		currentTime,
	};

	return <App.Provider value={ctx}>{children}</App.Provider>;
}
