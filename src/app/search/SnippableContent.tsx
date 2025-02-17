import { type MouseEventHandler, useState } from "react";
import { NoteContent } from "./NoteContent";
import type { Event } from "nostr-typedef";

type Props = {
	note: Event;
	onNoteBodyClick: MouseEventHandler<HTMLDivElement>;
};

export const SnippableContent = ({ note, onNoteBodyClick }: Props) => {
	const lengthThreshold = 256;
	const [isExpanded, setIsExpanded] = useState(false);
	const isLong = note.content.length > lengthThreshold;

	if (isLong) {
		if (isExpanded) {
			return (
				<div>
					<NoteContent note={note} onClick={onNoteBodyClick} />
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
				<div onClick={onNoteBodyClick} className="cursor-pointer">
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

	return <NoteContent note={note} onClick={onNoteBodyClick} />;
};
