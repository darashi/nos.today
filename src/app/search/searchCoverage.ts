export type CoverageState = "loaded" | "partial" | "unconfirmed";
type Interval = { since: number; until: number };
export type CoverageSpan = Interval & { state: CoverageState };
export type NotePosition = { fraction: number; time: number };

// A relay finishes disjoint windows. Equal endpoints cancel when adjacent windows join.
export function recordCoverage(edges: Map<number, number>, window: Interval, relayCount: number) {
	for (const [time, change] of [[window.since, relayCount], [window.until + 1, -relayCount]]) {
		const delta = (edges.get(time) ?? 0) + change;
		if (delta) edges.set(time, delta);
		else edges.delete(time);
	}
}

export function coverageSpans(edges: Map<number, number>, totalRelays: number) {
	const spans: CoverageSpan[] = [];
	let count = 0;
	let start = 0;
	for (const [time, delta] of [...edges].sort(([a], [b]) => a - b)) {
		if (count > 0) {
			const state = count === totalRelays ? "loaded" : "partial";
			const previous = spans.at(-1);
			if (previous?.state === state && previous.until + 1 === start) previous.until = time - 1;
			else spans.push({ since: start, until: time - 1, state });
		}
		count += delta;
		start = time;
	}
	return spans;
}

// The track follows the height of the displayed notes rather than elapsed time.
export function coverageBands(positions: NotePosition[], spans: CoverageSpan[]) {
	const bands: { fraction: number; state: CoverageState }[] = [];
	let index = spans.length - 1;
	for (const { fraction, time } of positions) {
		while (index >= 0 && spans[index].since > time) index--;
		const span = spans[index];
		const state = span && time <= span.until ? span.state : "unconfirmed";
		if (bands.at(-1)?.state !== state) bands.push({ fraction, state });
	}
	return bands;
}
