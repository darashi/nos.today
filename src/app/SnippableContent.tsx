import { Event } from "nostr-mux";
import { useState } from "react";
import { NoteContent } from "./NoteContent";

type Props = {
  note: Event;
};

export const SnippableContent = ({ note }: Props) => {
  const lengthThreshold = 256;
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = note.content.length > lengthThreshold;

  if (isLong) {
    if (isExpanded) {
      return (
        <div>
          <NoteContent note={note} />
          <div className="mt-2 w-full">
            <button
              className="link link-primary btn-link"
              onClick={() => setIsExpanded(false)}
            >
              Show less
            </button>
          </div>
        </div>
      );
    }
    return (
      <div>
        {isExpanded
          ? note.content
          : note.content.slice(0, lengthThreshold) + "..."}
        <div className="mt-2 w-full">
          <button
            className="link link-primary btn-link"
            onClick={() => setIsExpanded(true)}
          >
            Show more
          </button>
        </div>
      </div>
    );
  }

  return <NoteContent note={note} />;
};
