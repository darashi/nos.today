"use client";

import { useRef, useState } from "react";
import QueryForm from "./QueryForm";
import { Mux, Event, RelayMessageEvent, EventMessage } from "nostr-mux";
import { useApp } from "@/lib/App";
import { Note } from "./Note";
import Navbar from "./Navbar";

const purgeOldNotes = (notes: Record<string, Event>, limit: number) => {
  const sortedNotes = Object.values(notes).sort(
    (a: Event, b: Event) => a.created_at - b.created_at
  );

  for (let i = 0; i < sortedNotes.length - limit; i++) {
    delete notes[sortedNotes[i].id];
  }
};

export default function Search() {
  const app = useApp();
  const [query, setQuery] = useState("");
  const [inputtingQuery, setInputtingQuery] = useState("");
  const [possiblyMoreAvailable, setPossiblyMoreAvailable] = useState(false);

  const [notes, setNotes] = useState<Record<string, Event>>({});

  const subscriptionRef = useRef("");
  const limit = 100;
  const hardLimit = 5000;

  function addNotes(items: RelayMessageEvent<EventMessage>[]) {
    if (items.length > 0) {
      setPossiblyMoreAvailable(true);
    }

    setNotes((prev) => {
      let updated = { ...prev };
      for (const item of items) {
        updated[item.received.event.id] = item.received.event;
      }
      purgeOldNotes(updated, hardLimit);
      return updated;
    });
  }

  function subscribe(mux: Mux, search: string) {
    return mux.subscribe({
      filters: [{ kinds: [1], search, limit } as any],

      onEvent: addNotes,

      onRecovered: (relay) => {
        console.log(
          `relay(${relay.url}) was added or recovered. It joins subscription`
        );

        return [
          {
            kinds: [1],
            search: search,
            limit,
            since: Math.floor(Date.now() / 1000),
          },
        ];
      },
    });
  }

  function handleSubmit(q: string) {
    setNotes({});
    setPossiblyMoreAvailable(false);
    setQuery(q);
    if (!app.mux) {
      return;
    }
    if (subscriptionRef.current) {
      app.mux.unSubscribe(subscriptionRef.current);
    }
    subscriptionRef.current = subscribe(app.mux, q);
  }

  function handleReset() {
    setQuery("");
    setInputtingQuery("");
    setNotes({});
    if (subscriptionRef.current) {
      app.mux?.unSubscribe(subscriptionRef.current);
    }
  }

  const sortedNotes = Object.values(notes).sort(
    (a: Event, b: Event) => b.created_at - a.created_at
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
    const subscription = app.mux?.subscribe({
      filters: [{ kinds: [1], search: query, limit, until: oldest } as any],
      onEvent: addNotes,
      onEose() {
        app.mux.unSubscribe(subscription);
      },
    });
    setTimeout(() => {
      app.mux.unSubscribe(subscription);
    }, 10000);
  }

  return (
    <>
      <Navbar onClick={handleReset} />
      <div className="container mx-auto mt-5 px-2">
        <QueryForm
          onChange={(q) => {
            setInputtingQuery(q);
          }}
          onSubmit={handleSubmit}
          value={inputtingQuery}
        ></QueryForm>

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
            <Note note={note} key={note.id} />
          ))}
        </div>
        {query && possiblyMoreAvailable && sortedNotes.length < hardLimit && (
          <button className="my-5 link link-primary" onClick={handleMoreClick}>
            More
          </button>
        )}
      </div>
    </>
  );
}
