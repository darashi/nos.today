import { expect, test } from "vitest";
import { coverageBands, coverageSpans, recordCoverage } from "./searchCoverage";

test("combines confirmations from parent and child windows with inclusive endpoints", () => {
	const edges = new Map<number, number>();
	recordCoverage(edges, { since: 10, until: 39 }, 1);
	recordCoverage(edges, { since: 10, until: 19 }, 2);
	recordCoverage(edges, { since: 20, until: 29 }, 2);
	recordCoverage(edges, { since: 50, until: 50 }, 3);
	expect(coverageSpans(edges, 3)).toEqual([
		{ since: 10, until: 29, state: "loaded" },
		{ since: 30, until: 39, state: "partial" },
		{ since: 50, until: 50, state: "loaded" },
	]);
});

test("projects disjoint windows onto unequal note heights and keeps samples unconfirmed", () => {
	const positions = [55, 42, 41, 35, 33, 32, 26].map((time, i) => ({
		fraction: [0, 0.1, 0.16, 0.3, 0.4, 0.7, 0.96][i], time,
	}));
	const spans = coverageSpans(new Map([[30, 1], [34, -1], [41, 2], [43, -2]]), 2);
	expect(coverageBands(positions, spans)).toEqual([
		{ fraction: 0, state: "unconfirmed" },
		{ fraction: 0.1, state: "loaded" },
		{ fraction: 0.3, state: "unconfirmed" },
		{ fraction: 0.4, state: "partial" },
		{ fraction: 0.96, state: "unconfirmed" },
	]);
});
