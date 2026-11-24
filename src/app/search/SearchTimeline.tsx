import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from "react";
import type { Content, Event } from "nostr-typedef";
import { Note } from "./Note";
import { coverageBands, type CoverageSpan, type CoverageState, type NotePosition } from "./searchCoverage";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "long" });
const monthFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

type Day = { key: string; label: string; year: number; month: string; notes: Event[] };
type DateStop = { fraction: number; date: string; time: number };
type Tick = { fraction: number; dot: boolean; year?: number };
type TrackLayout = { stops: DateStop[]; ticks: Tick[]; notes: NotePosition[] };

const coverageLabels: Record<CoverageState, string> = {
	loaded: "Loaded",
	partial: "Partly loaded",
	unconfirmed: "Unconfirmed",
};

const yearHeight = 28;
const yearTop = (fraction: number) => fraction === 0 ? 4 : -yearHeight / 2;

function groupByDay(notes: Event[]) {
	const days: Day[] = [];
	for (const note of notes) {
		const date = new Date(note.created_at * 1000);
		const key = date.toDateString();
		let day = days.at(-1);
		if (day?.key !== key) {
			day = { key, label: dateFormat.format(date), year: date.getFullYear(), month: monthFormat.format(date), notes: [] };
			days.push(day);
		}
		day.notes.push(note);
	}
	return days;
}

function scrollRange() {
	return document.documentElement.scrollHeight - window.innerHeight;
}

function DateScrubber({ listRef, days, coverage, onViewDates }: {
	listRef: RefObject<HTMLDivElement | null>;
	days: Day[];
	coverage: CoverageSpan[];
	onViewDates: (times: number[]) => void;
}) {
	const [fraction, setFraction] = useState<number | null>(null);
	const [recentActivity, setRecentActivity] = useState(false);
	const [dragging, setDragging] = useState(false);
	const [hover, setHover] = useState<number | null>(null);
	const [layout, setLayout] = useState<TrackLayout>({ stops: [], ticks: [], notes: [] });
	const trackRef = useRef<HTMLDivElement>(null);
	const scrollable = fraction !== null;

	useLayoutEffect(() => {
		const list = listRef.current;
		const track = trackRef.current;
		if (!list || !track || !days.length) return;

		const syncPosition = () => {
			const range = scrollRange();
			setFraction(range > 0 ? Math.max(0, Math.min(1, window.scrollY / range)) : null);
		};

		const syncLayout = () => {
			syncPosition();
			const bounds = list.getBoundingClientRect();
			const trackHeight = track.getBoundingClientRect().height;
			const ticks: Tick[] = [];
			const notes: NotePosition[] = [];
			let lastDot = -Infinity;
			let lastYearBottom = -Infinity;
			const stops = days.map((day, index) => {
				const section = list.children[index];
				const top = section.getBoundingClientRect().top;
				const fraction = (top - bounds.top) / bounds.height;
				day.notes.forEach((note, i) => {
					// The first note also covers its date heading.
					const noteTop = i === 0 ? top : section.children[i + 1].getBoundingClientRect().top;
					notes.push({ fraction: (noteTop - bounds.top) / bounds.height, time: note.created_at });
				});
				const previous = days[index - 1];
				if (day.month !== previous?.month) {
					const offset = fraction * trackHeight;
					const dot = offset - lastDot >= 8;
					const labelTop = offset + yearTop(fraction);
					const showYear = day.year !== previous?.year && labelTop >= lastYearBottom + 6;
					if (dot) lastDot = offset;
					if (showYear) lastYearBottom = labelTop + yearHeight;
					if (dot || showYear) ticks.push({ fraction, dot, year: showYear ? day.year : undefined });
				}
				return { fraction, date: day.label, time: day.notes[0].created_at };
			});
			setLayout({ stops, ticks, notes });
		};

		syncLayout();
		const observer = new ResizeObserver(syncLayout);
		observer.observe(list);
		observer.observe(track);
		observer.observe(document.body);
		window.addEventListener("scroll", syncPosition, { passive: true });
		window.addEventListener("resize", syncLayout);
		return () => {
			observer.disconnect();
			window.removeEventListener("scroll", syncPosition);
			window.removeEventListener("resize", syncLayout);
		};
	}, [listRef, days]);

	function followPointer(event: PointerEvent<HTMLInputElement>) {
		const bounds = trackRef.current?.getBoundingClientRect();
		if (!bounds?.height || !event.isPrimary) return;
		const target = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
		if (event.pointerType !== "touch") setHover(target);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			window.scrollTo({ top: target * scrollRange(), behavior: "instant" });
		}
	}

	const current = fraction ?? 0;
	const preview = hover ?? current;
	const currentStop = layout.stops.findLast((stop) => stop.fraction <= current);
	const currentDate = currentStop?.date;
	const previewDate = hover === null ? currentDate : layout.stops.findLast((stop) => stop.fraction <= preview)?.date;
	const bands = useMemo(() => coverageBands(layout.notes, coverage), [layout.notes, coverage]);
	const currentState = bands.findLast((band) => band.fraction <= current)?.state ?? "unconfirmed";
	const previewState = hover === null ? currentState : bands.findLast((band) => band.fraction <= preview)?.state ?? "unconfirmed";

	const reportViewDates = useEffectEvent(() => {
		const bounds = listRef.current?.getBoundingClientRect();
		if (!bounds?.height || !layout.stops.length) return;
		const top = Math.max(bounds.top, trackRef.current?.parentElement?.getBoundingClientRect().top ?? 0);
		const bottom = Math.min(bounds.bottom, window.innerHeight);
		if (top >= bottom) return;
		const indexAt = (y: number) => Math.max(0, layout.stops.findLastIndex(
			(stop) => stop.fraction <= (y - bounds.top) / bounds.height,
		));
		const center = layout.stops[indexAt((top + bottom) / 2)].time;
		const visible = layout.stops.slice(indexAt(top), indexAt(bottom) + 1);
		onViewDates([...new Set([center, ...visible.map((stop) => stop.time)])]);
	});
	useEffect(() => {
		if (!scrollable) return;
		let idleTimer: number;
		let viewTimer: number;
		function showTemporarily() {
			setRecentActivity(true);
			window.clearTimeout(idleTimer);
			idleTimer = window.setTimeout(() => setRecentActivity(false), 1200);
		}
		function onScroll() {
			showTemporarily();
			window.clearTimeout(viewTimer);
			viewTimer = window.setTimeout(reportViewDates, 150);
		}
		showTemporarily();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", onScroll);
			window.clearTimeout(viewTimer);
			window.clearTimeout(idleTimer);
		};
	}, [scrollable]);

	return (
		<div
			hidden={!scrollable}
			data-visible={recentActivity || undefined}
			data-dragging={dragging || undefined}
			className="date-scrubber fixed top-16 right-0 bottom-0 z-10 cursor-ns-resize"
		>
			<input
				type="range"
				className="absolute inset-0 h-full w-full cursor-ns-resize touch-none opacity-0 [writing-mode:vertical-lr] [direction:ltr]"
				aria-label="Scroll search results by date"
				aria-orientation="vertical"
				aria-valuetext={currentDate && `${currentDate}, ${coverageLabels[currentState]}`}
				min={0}
				max={1}
				step="any"
				value={current}
				onPointerDown={(event) => {
					if (!event.isPrimary || event.button !== 0) return;
					event.preventDefault();
					event.currentTarget.focus({ preventScroll: true, focusVisible: false });
					event.currentTarget.setPointerCapture(event.pointerId);
					setDragging(true);
					followPointer(event);
				}}
				onLostPointerCapture={(event) => {
					if (event.isPrimary) setDragging(false);
				}}
				onPointerEnter={followPointer}
				onPointerMove={followPointer}
				onPointerLeave={() => setHover(null)}
				onPointerCancel={() => setHover(null)}
				onChange={(event) => {
					window.scrollTo({ top: event.target.valueAsNumber * scrollRange(), behavior: "instant" });
				}}
				onKeyDown={(event) => {
					const step = window.innerHeight / 10;
					const targets: Record<string, number> = {
						Home: 0,
						End: scrollRange(),
						ArrowDown: window.scrollY + step,
						ArrowUp: window.scrollY - step,
						PageDown: window.scrollY + window.innerHeight,
						PageUp: window.scrollY - window.innerHeight,
					};
					if (!Object.hasOwn(targets, event.key)) return;
					event.preventDefault();
					setHover(null);
					window.scrollTo({ top: targets[event.key], behavior: "instant" });
				}}
			/>
			<div ref={trackRef} aria-hidden="true" className="date-track pointer-events-none">
				<span className="date-thumb absolute right-2 h-7 w-1.5 -translate-y-1/2 rounded-full bg-base-content/55" style={{ top: `${current * 100}%` }} />
				<div className="date-scale absolute inset-0">
					<div className="date-coverage absolute inset-y-0 right-0 left-1 overflow-hidden rounded-lg">
						{bands.map(({ fraction, state }, index) => (
							<span
								key={fraction}
								data-coverage={state}
								className="absolute inset-x-0"
								style={{ top: `${fraction * 100}%`, bottom: `${(1 - (bands[index + 1]?.fraction ?? 1)) * 100}%` }}
							/>
						))}
					</div>
					{layout.ticks.map(({ fraction, dot, year }) => (
						<span key={fraction} className="absolute inset-x-0" style={{ top: `${fraction * 100}%` }}>
							{dot && <span className="date-dot absolute right-1.5 size-1 -translate-y-1/2 rounded-full bg-base-content/55" />}
							{year !== undefined && (
								<span className="date-year absolute right-3.5 rounded-lg bg-base-content/15 px-2 py-1 text-base leading-5 font-semibold tabular-nums text-base-content" style={{ top: yearTop(fraction) }}>
									{year}
								</span>
							)}
						</span>
					))}
					<div className="date-cursor absolute right-0 left-1 z-10 h-0.5 -translate-y-1/2 rounded-l-full" style={{ top: `${preview * 100}%` }}>
						<output className="date-preview absolute right-1 bottom-full mb-0.5 whitespace-nowrap rounded-md px-2 py-0.5 text-sm leading-5 font-medium">
							<span className="date-coverage-label mr-2 text-xs">{coverageLabels[previewState]}</span>
							{previewDate}
						</output>
					</div>
				</div>
			</div>
		</div>
	);
}

type Props = {
	notes: Event[];
	coverage: CoverageSpan[];
	profiles: Record<string, Content.Metadata>;
	queryTerms: string[];
	onViewDates: (times: number[]) => void;
};

export default function SearchTimeline({ notes, coverage, profiles, queryTerms, onViewDates }: Props) {
	const days = useMemo(() => groupByDay(notes), [notes]);
	const listRef = useRef<HTMLDivElement>(null);

	return (
		<div className="search-timeline mt-2">
			<div ref={listRef}>
				{days.map((day) => (
					<section key={day.key} data-date={day.label}>
						<h2 className="sticky top-16 z-10 bg-base-100 px-1 py-2 text-sm font-semibold">
							{day.label}
						</h2>
						{day.notes.map((note) => (
							<Note key={note.id} note={note} profile={profiles[note.pubkey]} queryTerms={queryTerms} />
						))}
					</section>
				))}
			</div>
			{days.length > 0 && <DateScrubber listRef={listRef} days={days} coverage={coverage} onViewDates={onViewDates} />}
		</div>
	);
}
