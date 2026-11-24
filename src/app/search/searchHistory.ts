import type { Event } from "nostr-typedef";

export const maxNotes = 5000;
export const pageSize = 100;

type RelayPage = { url: string; limit?: number };

export type SearchWindow = {
	since: number;
	until: number;
	relays: RelayPage[];
};

export function initialWindow(relays: string[], until: number): SearchWindow {
	return { since: 0, until, relays: relays.map((url) => ({ url })) };
}

function partition(window: SearchWindow, cuts: number[]) {
	const starts = [window.since, ...cuts.filter((t) => t > window.since && t <= window.until)];
	return starts.map((since, index) => {
		const until = (starts[index + 1] ?? window.until + 1) - 1;
		return { ...window, since, until };
	});
}

// Keep the intervals on either side available when the reader jumps to a month.
export function prioritizeDate(windows: SearchWindow[], time: number) {
	const date = new Date(time * 1000);
	let index = windows.findIndex((w) => w.since <= time && time <= w.until);
	if (index < 0) {
		const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000;
		const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime() / 1000;
		index = windows.findLastIndex((w) => w.since < dayEnd && w.until >= dayStart);
	}
	if (index < 0) return -1;
	const window = windows[index];
	const start = new Date(date.getFullYear(), date.getMonth(), 1).getTime() / 1000;
	const end = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime() / 1000;
	if (start <= window.since && window.until < end) return index;
	windows.splice(index, 1, ...partition(window, [start, end]));
	return index + (start > window.since ? 1 : 0);
}

// A nonempty first response can reveal a silent relay cap below the requested limit.
export function isExhausted(relay: RelayPage, count: number) {
	return count === 0 || (relay.limit !== undefined && count < relay.limit);
}

// A full relevance-ranked response can omit matches anywhere in the interval.
export function resolveWindow(window: SearchWindow, replies: Event[][]) {
	const { since, until } = window;
	const fullRelays: RelayPage[] = [];
	let splitAt = since + 1;

	for (const [index, events] of replies.entries()) {
		const relay = window.relays[index];
		if (isExhausted(relay, events.length)) continue;
		const limit = relay.limit ?? Math.min(pageSize, events.length);
		if (since === until && limit >= maxNotes) continue;
		fullRelays.push({ url: relay.url, limit: since === until ? Math.min(limit * 2, maxNotes) : limit });
		// Use the median as a split hint only. Both sides will be searched.
		const times = events.map((event) => event.created_at).sort((a, b) => a - b);
		const median = times[Math.floor(times.length / 2)];
		splitAt = Math.max(splitAt, median);
		if (times[0] !== times.at(-1)) {
			splitAt = Math.max(splitAt, since + Math.ceil((until - since) / 2));
		}
	}

	if (!fullRelays.length) return [];
	const pending = { ...window, relays: fullRelays };
	// Keep the pending intervals in chronological order. Nostr time bounds are inclusive.
	return since === until ? [pending] : partition(pending, [splitAt]);
}
