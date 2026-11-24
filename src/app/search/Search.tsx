import { useEffect, useMemo, useRef, useState } from "react";
import QueryForm from "../QueryForm";
import { useApp } from "@/lib/App";
import SearchTimeline from "./SearchTimeline";
import { useSearchParams } from "react-router-dom";
import {
	batch,
	createRxBackwardReq,
	createRxForwardReq,
	createRxOneshotReq,
	type EventPacket,
	latestEach,
	uniq,
} from "rx-nostr";
import { asapScheduler, EMPTY, forkJoin, Subscription } from "rxjs";
import { bufferTime, catchError, filter, map, observeOn, tap, toArray } from "rxjs/operators";
import type { Event, Content } from "nostr-typedef";
import { searchRelays } from "@/lib/config";
import { initialWindow, maxNotes, pageSize, prioritizeDate, resolveWindow } from "./searchHistory";
import { coverageSpans, recordCoverage, type CoverageSpan } from "./searchCoverage";

function normalize(str: string): string {
	return str.normalize("NFKC").toLowerCase();
}

export default function Search() {
	const [params] = useSearchParams();
	const query = params.get("q") || "";
	return <SearchResults key={query} query={query} />;
}

function SearchResults({ query }: { query: string }) {
	const { rxNostr } = useApp();
	const queryTerms = useMemo(
		() =>
			normalize(query)
				.trim()
				.split(/\s+/)
				.filter((term) => term.length > 0),
		[query],
	);

	const [notes, setNotes] = useState<Event[]>([]);
	const [coverage, setCoverage] = useState<CoverageSpan[]>([]);
	const [profiles, setProfiles] = useState<Record<string, Content.Metadata>>({});
	const profileReqRef = useRef<ReturnType<typeof createRxBackwardReq> | undefined>(undefined);
	const endRef = useRef<HTMLDivElement>(null);
	const nextPageRef = useRef<(() => void) | undefined>(undefined);
	const viewDatesRef = useRef<((times: number[]) => void) | undefined>(undefined);

	useEffect(() => {
		const profileReq = createRxBackwardReq();
		profileReqRef.current = profileReq;

		const batchedReq = profileReq.pipe(
			bufferTime(50),
			batch((a, b) => {
				const aAuthors = a.flatMap((e) => e.authors);
				const bAuthors = b.flatMap((e) => e.authors);
				const authors = Array.from(new Set([...aAuthors, ...bAuthors])).filter(
					(item) => item !== undefined,
				);
				const filter = { kinds: [0], authors };

				return [filter];
			}),
		);
		const subscription = rxNostr
			.use(batchedReq)
			.pipe(latestEach(({ event }) => event.pubkey))
			.subscribe((packet: EventPacket) => {
				const { event } = packet;
				const profile = JSON.parse(event.content);
				setProfiles((prev) => ({ ...prev, [event.pubkey]: profile }));
			});

		return () => {
			subscription.unsubscribe();
		};
	}, [rxNostr]);

	useEffect(() => {
		if (!query || !searchRelays.length) return;

		const subscriptions = new Subscription();
		const events = new Map<string, Event>();
		const overview = initialWindow(searchRelays, Math.floor(Date.now() / 1000));
		const windows = [overview];
		const coverageEdges = new Map<number, number>();
		const historyRequests = new Map<string, { id: string; received: number; limit: number }>();
		const acknowledged = new Set<string>();
		let viewDates: number[] = [];
		let moreRequested = true;
		let frame: number | undefined;
		let loading = false;

		// A one-shot request also completes on timeout or CLOSED. Only EOSE confirms a range.
		subscriptions.add(rxNostr.createOutgoingMessageObservable().subscribe(({ to, message }) => {
			if (message[0] === "REQ" && message[2]?.search === query && message[2].limit) {
				historyRequests.set(to, { id: message[1], received: 0, limit: message[2].limit });
			}
		}));
		subscriptions.add(rxNostr.createAllMessageObservable().subscribe((packet) => {
			if (packet.type !== "EOSE" && packet.type !== "EVENT") return;
			const request = historyRequests.get(packet.from);
			if (!request || request.id !== packet.subId) return;
			if (packet.type === "EVENT") request.received++;
			else if (request.received < request.limit) {
				acknowledged.add(new URL(packet.from).href);
			}
		}));

		function updateResults() {
			if (frame !== undefined) return;
			frame = requestAnimationFrame(() => {
				frame = undefined;
				const sorted = Array.from(events.values()).sort((a, b) => b.created_at - a.created_at);
				for (const note of sorted.splice(maxNotes)) events.delete(note.id);
				setNotes(sorted);
			});
		}

		function addEvent(event: Event) {
			if (events.has(event.id)) return;
			// Some search relays return notes that do not match all the terms.
			const content = normalize(event.content);
			if (!queryTerms.every((term) => content.includes(term))) return;
			events.set(event.id, event);
			profileReqRef.current?.emit({ kinds: [0], authors: [event.pubkey], limit: 1 });
			updateResults();
		}

		function loadPage() {
			if (loading || !windows.length || events.size >= maxNotes) return;
			let index = -1;
			for (const time of viewDates) {
				index = prioritizeDate(windows, time);
				if (index >= 0) break;
			}
			if (index < 0) {
				if (!moreRequested) return;
				index = windows.length - 1;
			}
			const window = windows[index];
			nextPageRef.current = undefined;
			loading = true;
			historyRequests.clear();
			acknowledged.clear();
			const failed = new Set<string>();
			const { since, until } = window;
			const requests = window.relays.map(({ url, limit = pageSize }) => {
				const req = createRxOneshotReq({
					filters: { kinds: [1], search: query, since, until, limit },
				});
				return rxNostr.use(req, { relays: [url] }).pipe(
					uniq(),
					map(({ event }) => event),
					filter((event) => event.created_at >= since && event.created_at <= until),
					tap((event) => {
						if (window === overview) addEvent(event);
					}),
					catchError(() => {
						failed.add(url);
						return EMPTY;
					}),
					toArray(),
				);
			});
			// Let all listeners see the final EOSE, including for an empty response.
			subscriptions.add(forkJoin(requests).pipe(observeOn(asapScheduler)).subscribe((replies) => {
				loading = false;
				const { notes, remaining, exhausted } = resolveWindow(window, replies);
				const confirmed = exhausted.filter((url) => !failed.has(url) && acknowledged.has(new URL(url).href)).length;
				if (confirmed) {
					recordCoverage(coverageEdges, window, confirmed);
					setCoverage(coverageSpans(coverageEdges, searchRelays.length));
				}
				windows.splice(index, 1, ...remaining);
				if (remaining.length) {
					nextPageRef.current = requestMore;
					loadPage();
					if (!loading) updateResults();
					return;
				}
				moreRequested = false;
				for (const event of notes) addEvent(event);
				if (windows.length && events.size < maxNotes) nextPageRef.current = requestMore;
				updateResults();
				loadPage();
			}));
		}

		function requestMore() {
			moreRequested = true;
			loadPage();
		}
		viewDatesRef.current = (times) => {
			viewDates = times;
			loadPage();
		};

		const live = createRxForwardReq();
		subscriptions.add(rxNostr.use(live, { relays: searchRelays }).pipe(uniq()).subscribe(
			({ event }) => addEvent(event),
		));
		live.emit({ kinds: [1], search: query, limit: 0 });
		loadPage();

		return () => {
			nextPageRef.current = undefined;
			viewDatesRef.current = undefined;
			subscriptions.unsubscribe();
			if (frame !== undefined) cancelAnimationFrame(frame);
		};
	}, [rxNostr, query, queryTerms]);

	useEffect(() => {
		const end = endRef.current;
		if (!end || !nextPageRef.current) return;
		const observer = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting) {
				observer.disconnect();
				nextPageRef.current?.();
			}
		}, { rootMargin: "0px 0px 480px" });
		observer.observe(end);
		return () => observer.disconnect();
	}, [notes]);

	return (
		<div className="container mx-auto mt-5 px-2">
			<QueryForm initialValue={query} />

			<div className="mt-8">
				{query && (
					<div className="flex align-middle">
						<div>
							Search for <strong>{query}</strong> ({notes.length} hits)
						</div>
						<div className="relative flex h-3 w-3 ml-2 my-auto">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
						</div>
					</div>
				)}
			</div>

			<SearchTimeline notes={notes} coverage={coverage} profiles={profiles} queryTerms={queryTerms} onViewDates={(times) => viewDatesRef.current?.(times)} />
			<div ref={endRef} aria-hidden="true" className="h-px" />
		</div>
	);
}
