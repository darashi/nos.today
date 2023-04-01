import { Event } from "nostr-mux";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { parseReferences } from "nostr-tools";
import { bech32 } from "@scure/base";

type Props = {
  note: Event;
};

marked.setOptions({ breaks: true });

function hexToBech32(prefix: string, hex: string) {
  const words = bech32.toWords(Buffer.from(hex, "hex"));
  return bech32.encode(prefix, words);
}

export const NoteContent = ({ note }: Props) => {
  let content = note.content;
  const parsed = parseReferences(note);
  for (const ref of parsed) {
    let bech32 = "";
    if (ref.profile) {
      bech32 = hexToBech32("npub", ref.profile.pubkey);
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
      className="prose-a:text-primary"
      dangerouslySetInnerHTML={{ __html: contentHTML }}
    />
  );
};
