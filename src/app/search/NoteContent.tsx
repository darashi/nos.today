import type { Event } from "nostr-typedef";
import DOMPurify from "dompurify";
import { type MouseEventHandler, useRef } from "react";
import { renderContent } from "@/lib/renderer/renderer";
import { useSearchHighlight } from "./useSearchHighlight";

type Props = {
	note: Event;
	queryTerms: ReadonlyArray<string>;
	onClick: MouseEventHandler<HTMLDivElement>;
};

if (typeof window !== "undefined") {
	DOMPurify.addHook("afterSanitizeAttributes", (node) => {
		if (node.tagName === "A") {
			const href = node.getAttribute("href");
			if (href && !href.startsWith("nostr:")) {
				node.setAttribute("target", "_blank");
				node.setAttribute("rel", "noopener");
			}
		}
	});
}

export const NoteContent = ({ note, queryTerms, onClick }: Props) => {
	const contentHTML = renderContent(note.content);
	const containerRef = useRef<HTMLDivElement | null>(null);

	useSearchHighlight(containerRef, queryTerms, {
		dependencyKey: note.content,
	});

	return (
		<div
			ref={containerRef}
			className="cursor-pointer prose-a:text-primary note-content"
			onClick={onClick}
			dangerouslySetInnerHTML={{ __html: contentHTML }}
		/>
	);
};
