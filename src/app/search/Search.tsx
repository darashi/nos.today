"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QueryForm from "../QueryForm";
import { useApp } from "@/lib/App";
import { Note } from "./Note";
import { useSearchParams } from "next/navigation";
import {
	batch,
	createRxBackwardReq,
	createRxForwardReq,
	EventPacket,
	latestEach,
	uniq,
} from "rx-nostr";
import { bufferTime } from "rxjs/operators";
import type { Subscription as RxSubscription } from "rxjs";
import type { Event, Content } from "nostr-typedef";
import { regularRelays, searchRelays } from "@/lib/config";

const purgeOldNotes = (notes: Record<string, Event>, limit: number) => {
	const sortedNotes = Object.values(notes).sort(
		(a: Event, b: Event) => a.created_at - b.created_at,
	);

	for (let i = 0; i < sortedNotes.length - limit; i++) {
		delete notes[sortedNotes[i].id];
	}
};

function normalize(str: string): string {
	return str.normalize("NFKC").toLowerCase();
}

export default function Search() {
	const app = useApp();
	const params = useSearchParams();
	const query = params.get("q") || "";
	const queryTerms = useMemo(() => normalize(query).split(/\s+/), [query]);
	const [possiblyMoreAvailable, setPossiblyMoreAvailable] = useState(false);

	const [notes, setNotes] = useState<Record<string, Event>>({});
	const [profiles, setProfiles] = useState<Record<string, Content.Metadata>>(
		{},
	);

	const rxSubscriptionRef = useRef<RxSubscription>();

	const limit = 100;
	const hardLimit = 5000;

	const addEvent = useCallback(
		(event: Event) => {
			setNotes((prev) => {
				const updated = { ...prev };
				// Relays may return events that do not actually match the query, so verify here.
				const normalizedContent = normalize(event.content);
				if (queryTerms.every((term) => normalizedContent.includes(term))) {
					updated[event.id] = event;
				}
				purgeOldNotes(updated, hardLimit);
				return updated;
			});
		},
		[queryTerms],
	);

	useEffect(() => {
		setNotes({});

		if (query && app.rxNostr) {
			const rxReq = createRxForwardReq("search");
			const profileReq = createRxBackwardReq();

			rxSubscriptionRef.current = app.rxNostr
				.use(rxReq, { relays: searchRelays })
				.pipe(uniq())
				.subscribe((packet: EventPacket) => {
					const { event } = packet;
					profileReq.emit({ kinds: [0], authors: [event.pubkey], limit: 1 });

					addEvent(event);
				});

			const batchedReq = profileReq.pipe(bufferTime(10), batch());

			app.rxNostr
				.use(batchedReq)
				.pipe(latestEach(({ event }) => event.pubkey))
				.subscribe((packet: EventPacket) => {
					const { event } = packet;
					const profile = JSON.parse(event.content);
					setProfiles((prev) => ({ ...prev, [event.pubkey]: profile }));
				});

			rxReq.emit({ kinds: [1], search: query, limit });
		}

		return () => {
			rxSubscriptionRef.current?.unsubscribe();
		};
	}, [app.rxNostr, query]);

	const sortedNotes = Object.values(notes).sort(
		(a: Event, b: Event) => b.created_at - a.created_at,
	);

	function handleMoreClick() {
		// 	setPossiblyMoreAvailable(false);
		// 	if (sortedNotes.length === 0) {
		// 		return;
		// 	}
		// 	let oldest = sortedNotes[sortedNotes.length - 1].created_at;
		// 	if (oldest === 0) {
		// 		oldest = 1; // There seems to be a relay that treats 0 as unspecified?
		// 	}
		// 	const subscription = app.mux?.subscribe({
		// 		filters: [{ kinds: [1], search: query, limit, until: oldest } as any],
		// 		onEvent: addNotes,
		// 		onEose() {
		// 			app.mux.unSubscribe(subscription);
		// 		},
		// 	});
		// 	setTimeout(() => {
		// 		app.mux.unSubscribe(subscription);
		// 	}, 10000);
	}

	return (
		<div className="container mx-auto mt-5 px-2">
			<QueryForm initialValue={query}></QueryForm>

			<div className="mt-8">
				{query && (
					<div className="flex align-middle">
						<div>
							Search for <strong>{query}</strong> ({sortedNotes.length} hits)
						</div>
						<div className="relative flex h-3 w-3 ml-2 my-auto">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
						</div>
					</div>
				)}
			</div>

			<div className="mt-2">
				{sortedNotes.map((note: Event) => (
					<Note note={note} profile={profiles[note.pubkey]} key={note.id} />
				))}
			</div>
			{query && possiblyMoreAvailable && sortedNotes.length < hardLimit && (
				<button className="my-5 link link-primary" onClick={handleMoreClick}>
					More
				</button>
			)}
		</div>
	);
}
