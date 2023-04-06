import { MouseEventHandler } from "react";
import { encodeBech32ID } from "nostr-mux/dist/core/utils";
import { Event } from "nostr-mux";

export const NoteDropdownMenu = ({ note }: { note: Event }) => {
  const closeMenu = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleNoteIdClick: MouseEventHandler<HTMLElement> = (e) => {
    const bech32 = encodeBech32ID("note", note.id);
    bech32 && navigator.clipboard.writeText(bech32);
    closeMenu();
  };

  const handleAuthorNpubClick: MouseEventHandler<HTMLElement> = (e) => {
    const bech32 = encodeBech32ID("npub", note.pubkey);
    bech32 && navigator.clipboard.writeText(bech32);
    closeMenu();
  };

  return (
    <div className="dropdown dropdown-bottom dropdown-end">
      <label tabIndex={0} className="btn btn-xs ml-3">
        …
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content menu text-xs p-2 shadow bg-neutral rounded-box w-36"
      >
        <li onClick={handleNoteIdClick}>
          <a>Copy note id</a>
        </li>
        <li onClick={handleAuthorNpubClick}>
          <a>Copy author npub</a>
        </li>
      </ul>
    </div>
  );
};
