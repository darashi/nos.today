"use client";

import type { Event } from "nostr-typedef";
import DOMPurify from "dompurify";
import type { MouseEventHandler } from "react";
import { renderContent } from "@/lib/renderer/renderer";

type Props = {
	note: Event;
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

export const NoteContent = ({ note, onClick }: Props) => {
	const contentHTML = renderContent(note.content);
	return (
		<div
			className="cursor-pointer prose-a:text-primary"
			onClick={onClick}
			dangerouslySetInnerHTML={{ __html: contentHTML }}
		/>
	);
};
