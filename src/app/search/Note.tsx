import { useApp } from "@/lib/App";
import { type MouseEventHandler, useState } from "react";
import { Avatar } from "./Avatar";
import {
	differenceInMinutes,
	differenceInSeconds,
	format,
	isSameDay,
} from "date-fns";
import { SnippableContent } from "./SnippableContent";
import { nip19 } from "nostr-tools";
import { Nip36Protection } from "./Nip36Protection";
import { FaCheck, FaCopy } from "react-icons/fa";
import type { Event, Content } from "nostr-typedef";

type Props = {
	note: Event;
	profile: Content.Metadata | undefined;
	queryTerms: string[];
};

function formatDatetime(date: Date, currentTime: Date) {
	const sec = differenceInSeconds(currentTime, date);

	if (sec < 60) {
		return "<1m";
	}
	if (sec < 60 * 60) {
		return `${differenceInMinutes(currentTime, date)}m`;
	}
	if (isSameDay(currentTime, date)) {
		return format(date, "HH:mm");
	}
	return format(date, "yyyy-MM-dd");
}

const CopyButton = ({ text, title }: { text: string; title: string }) => {
	const [isCopied, setIsCopied] = useState(false);
	const handleClick = () => {
		navigator.clipboard.writeText(text);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 1000);
	};

	return isCopied ? (
		<span
			className={"btn btn-primary btn-ghost btn-xs text-success"}
			title={title}
			onClick={handleClick}
			onKeyDown={handleClick}
		>
			<FaCheck />
		</span>
	) : (
		<span
			className={"btn btn-primary btn-ghost btn-xs"}
			title={title}
			onClick={handleClick}
			onKeyDown={handleClick}
		>
			<FaCopy />
		</span>
	);
};

export const Note = ({ note, profile, queryTerms }: Props) => {
	const app = useApp();

	const date = new Date(note.created_at * 1000);
	const npub = nip19.npubEncode(note.pubkey);
	const noteId = nip19.neventEncode({ id: note.id, kind: note.kind });
	const pubkeyUri = `nostr:${npub}`;
	const noteUri = `nostr:${noteId}`;
	const proxyName = note.tags.find((tag) => tag[0] === "proxy")?.[2];

	const handleNoteBodyClick: MouseEventHandler<HTMLDivElement> = (e) => {
		if (e.target instanceof HTMLAnchorElement) {
			// Anchors have priority. We do not have to navigate to the note.
			return;
		}
		window.location.replace(noteUri);
	};

	return (
		<div key={note.id} className="card card-bordered shadow-lg my-3">
			<div className="card-body break-all p-5 text-base">
				<div className="flex gap-3">
					<Avatar pubkeyUri={pubkeyUri} profile={profile} />
					<div className="flex flex-col w-full gap-2">
						<div className="flex flex-row items-top">
							<div className="flex-none text-sm">
								<a href={pubkeyUri}>
									{!profile && (
										<div className="my-2 h-2 w-32 bg-slate-200 rounded animate-pulse" />
									)}
								</a>
							</div>

							<div className="flex-1 mr-4">
								<a href={pubkeyUri}>
									<strong>{profile?.display_name}</strong>{" "}
									{profile?.name && `@${profile.name}`}
								</a>
								<span className="ml-1">
									{npub && <CopyButton text={npub} title="Copy author npub" />}
								</span>
								{proxyName && (
									<span className="ml-2 text-base-content/60">
										via {proxyName}
									</span>
								)}
							</div>

							<div>
								<span title={date.toISOString()} className="text-sm flex-none">
									{formatDatetime(date, app.currentTime)}
								</span>
							</div>
						</div>
						<Nip36Protection note={note}>
							<SnippableContent
								note={note}
								queryTerms={queryTerms}
								onNoteBodyClick={handleNoteBodyClick}
							/>
						</Nip36Protection>
					</div>
				</div>
				<div className="text-right">
					{noteId && <CopyButton text={noteId} title="Copy note Id" />}
				</div>
			</div>
		</div>
	);
};
