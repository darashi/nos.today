"use client";

import { Event } from "nostr-mux";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { parseReferences, nip19 } from "nostr-tools";
import { MouseEventHandler } from "react";

type Props = {
  note: Event;
  onClick: MouseEventHandler<HTMLDivElement>;
};

if (typeof window !== "undefined") {
  DOMPurify.addHook("afterSanitizeAttributes", function (node) {
    if (node.tagName === "A") {
      const href = node.getAttribute("href");
      if (href && !href.startsWith("nostr:")) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener");
      }
    }
  });
}

export const NoteContent = ({ note, onClick }: Props) => {
  // Expand NIP-27
  let content = note.content;
  const parsed = parseReferences(note);
  for (const ref of parsed) {
    let bech32 = "";
    if (ref.profile) {
      bech32 = nip19.npubEncode(ref.profile.pubkey);
    }
    // TODO better embedding of references

    if (bech32) {
      const uri = "nostr:" + bech32;
      const anchor = `<a href="${uri}">${bech32}</a>`;
      content = content.replaceAll(ref.text, anchor);
    }
  }

  const contentHTML = DOMPurify.sanitize(marked.parse(content), {
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|nostr):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
  return (
    <div
      className="cursor-pointer prose-a:text-primary"
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: contentHTML }}
    />
  );
};
