import type { Event } from "nostr-typedef";
import { expect, test } from "vitest";
import { initialWindow, isExhausted, maxNotes, pageSize, prioritizeDate, resolveWindow, type SearchWindow } from "./searchHistory";

function note(time: number, id = String(time)): Event {
	return { id, created_at: time, kind: 1, pubkey: "", sig: "", tags: [], content: "検索" };
}

test("covers all matches from ranked and silently capped relays", () => {
	const ranked = [4, 90, 0, 31, 40, 12, 78, 63, 100, 2].map((time) => note(time));
	const recent = [100, 99, 90, 83, 71, 60, 50, 20].map((time) => note(time));
	const windows = [initialWindow(["ranked", "recent"], 100)];
	const returned = new Set<number>();
	while (windows.length) {
		const window = windows.pop()!;
		const replies = window.relays.map(({ url, limit = pageSize }) => {
			const events = url === "ranked" ? ranked : recent;
			const cap = url === "ranked" ? 3 : 5;
			return events.filter((e) => window.since <= e.created_at && e.created_at <= window.until)
				.slice(0, Math.min(limit, cap));
		});
		for (const event of replies.flat()) returned.add(event.created_at);
		windows.push(...resolveWindow(window, replies));
	}
	const expected = new Set([...ranked, ...recent].map((e) => e.created_at));
	expect(returned).toEqual(expected);
});

test("a jump prioritizes the displayed month and preserves both adjacent ranges", () => {
	const start = new Date(2025, 10, 1).getTime() / 1000;
	const end = new Date(2025, 11, 1).getTime() / 1000 - 1;
	const window = initialWindow(["one"], end + 10);
	const windows = [window];
	const index = prioritizeDate(windows, start + 100);
	expect(index).toBe(1);
	expect(windows.map((w) => [w.since, w.until])).toEqual([[0, start - 1], [start, end], [end + 1, end + 10]]);
	windows.splice(index, 1);
	expect(prioritizeDate(windows, end)).toBe(-1);
});

test("only re-queries relays whose window was full", () => {
	const window: SearchWindow = {
		since: 0, until: 10, relays: [{ url: "full", limit: 2 }, { url: "done", limit: 2 }],
	};
	const remaining = resolveWindow(window, [[note(1), note(9)], [note(7)]]);
	expect(remaining.map((w) => [w.since, w.until])).toEqual([[0, 8], [9, 10]]);
	for (const part of remaining) expect(part.relays.map((r) => r.url)).toEqual(["full"]);
	expect(resolveWindow(remaining[0], [[]])).toEqual([]);
});

test("raises the limit for a saturated second and stops at the display cap", () => {
	const window = { ...initialWindow(["one"], 42), since: 42 };
	const notes = Array.from({ length: pageSize + 6 }, (_, i) => note(42, String(i)));
	const remaining = resolveWindow(window, [notes.slice(0, pageSize)]);
	expect(remaining).toHaveLength(1);
	expect(remaining[0].relays[0].limit).toBe(pageSize * 2);
	expect(isExhausted(remaining[0].relays[0], notes.length)).toBe(true);
	expect(resolveWindow(remaining[0], [notes])).toEqual([]);

	const capped = { ...window, relays: [{ url: "one", limit: maxNotes }] };
	const full = Array.from({ length: maxNotes }, (_, i) => note(42, String(i)));
	expect(isExhausted(capped.relays[0], full.length)).toBe(false);
	expect(resolveWindow(capped, [full])).toEqual([]);
});
