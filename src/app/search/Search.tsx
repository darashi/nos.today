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
	type EventPacket,
	latestEach,
	uniq,
} from "rx-nostr";
import { bufferTime } from "rxjs/operators";
import type { Event, Content } from "nostr-typedef";
import { searchRelays } from "@/lib/config";

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
	const queryTerms = useMemo(
		() =>
			normalize(query)
				.trim()
				.split(/\s+/)
				.filter((term) => term.length > 0),
		[query],
	);
	const [possiblyMoreAvailable, setPossiblyMoreAvailable] = useState(false);

	const [notes, setNotes] = useState<Record<string, Event>>({});
	const [profiles, setProfiles] = useState<Record<string, Content.Metadata>>(
		{},
	);
	const profileReqRef = useRef<ReturnType<typeof createRxBackwardReq> | undefined>(undefined);

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
		const subscription = app.rxNostr
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
	}, [app.rxNostr]);

	useEffect(() => {
		setNotes({});

		if (!query) {
			return;
		}

		const rxReq = createRxForwardReq("search");
		const subscription = app.rxNostr
			.use(rxReq, { relays: searchRelays })
			.pipe(uniq())
			.subscribe((packet: EventPacket) => {
				const { event } = packet;
				profileReqRef.current?.emit({
					kinds: [0],
					authors: [event.pubkey],
					limit: 1,
				});

				addEvent(event);
				setPossiblyMoreAvailable(true);
			});
		rxReq.emit({ kinds: [1], search: query, limit });

		return () => {
			subscription.unsubscribe();
		};
	}, [app.rxNostr, query, addEvent]);

	const sortedNotes = Object.values(notes).sort(
		(a: Event, b: Event) => b.created_at - a.created_at,
	);

	function handleMoreClick() {
		setPossiblyMoreAvailable(false);
		if (sortedNotes.length === 0) {
			return;
		}
		let oldest = sortedNotes[sortedNotes.length - 1].created_at;
		if (oldest === 0) {
			oldest = 1; // There seems to be a relay that treats 0 as unspecified?
		}

		const rxReq = createRxBackwardReq();
		app.rxNostr
			.use(rxReq, { relays: searchRelays })
			.pipe(uniq())
			.subscribe((packet: EventPacket) => {
				const { event } = packet;
				profileReqRef.current?.emit({
					kinds: [0],
					authors: [event.pubkey],
					limit: 1,
				});
				addEvent(event);
				setPossiblyMoreAvailable(true);
			});
		rxReq.emit({ kinds: [1], search: query, limit, until: oldest });
	}

	return (
		<div className="container mx-auto mt-5 px-2">
			<QueryForm initialValue={query} />

			<div className="mt-8">
				{query && (
					<div className="flex align-middle">
						<div>
							Search for <strong>{query}</strong> ({sortedNotes.length} hits)
						</div>
						<div className="relative flex h-3 w-3 ml-2 my-auto">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
						</div>
					</div>
				)}
			</div>

			<div className="mt-2">
				{sortedNotes.map((note: Event) => (
					<Note
						note={note}
						profile={profiles[note.pubkey]}
						queryTerms={queryTerms}
						key={note.id}
					/>
				))}
			</div>
			{query && possiblyMoreAvailable && sortedNotes.length < hardLimit && (
				<button
					type="button"
					className="my-5 link link-primary"
					onClick={handleMoreClick}
				>
					More
				</button>
			)}
		</div>
	);
}
