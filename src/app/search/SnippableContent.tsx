import { type MouseEventHandler, useRef, useState } from "react";
import { NoteContent } from "./NoteContent";
import type { Event } from "nostr-typedef";
import { useSearchHighlight } from "./useSearchHighlight";

type Props = {
	note: Event;
	queryTerms: ReadonlyArray<string>;
	onNoteBodyClick: MouseEventHandler<HTMLDivElement>;
};

export const SnippableContent = ({
	note,
	onNoteBodyClick,
	queryTerms,
}: Props) => {
	const lengthThreshold = 256;
	const [isExpanded, setIsExpanded] = useState(false);
	const isLong = note.content.length > lengthThreshold;
	const snippetRef = useRef<HTMLDivElement | null>(null);
	const snippetVisible = isLong && !isExpanded;

	useSearchHighlight(snippetRef, queryTerms, {
		enabled: snippetVisible,
		dependencyKey: note.content,
	});

	if (isLong) {
		if (isExpanded) {
			return (
				<div>
					<NoteContent
						note={note}
						queryTerms={queryTerms}
						onClick={onNoteBodyClick}
					/>
					<div className="mt-2 w-full">
						<button
							type="button"
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
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: this should fire only on note body click */}
				<div
					ref={snippetRef}
					onClick={onNoteBodyClick}
					className="cursor-pointer"
				>
					{isExpanded
						? note.content
						: `${note.content.slice(0, lengthThreshold)}...`}
				</div>
				<div className="mt-2 w-full">
					<button
						type="button"
						className="link link-primary btn-link"
						onClick={() => setIsExpanded(true)}
					>
						Show more
					</button>
				</div>
			</div>
		);
	}

	return (
		<NoteContent
			note={note}
			queryTerms={queryTerms}
			onClick={onNoteBodyClick}
		/>
	);
};
