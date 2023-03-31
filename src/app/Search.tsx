"use client";

import { useRef, useState } from "react";
import QueryForm from "./QueryForm";
import { Mux, Event } from "nostr-mux";
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

  const [notes, setNotes] = useState<Record<string, Event>>({});

  const subscriptionRef = useRef("");

  function subscribe(mux: Mux, search: string) {
    const limit = 100;
    const hardLimit = 5000;

    return mux.subscribe({
      filters: [{ kinds: [1], search: search, limit } as any],

      onEvent: (e) => {
        setNotes((prev) => {
          let updated = { ...prev };
          for (const item of e) {
            updated[item.received.event.id] = item.received.event;
          }
          purgeOldNotes(updated, hardLimit);
          return updated;
        });
      },

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
      </div>
    </>
  );
}
