declare global {
	interface Highlight extends Iterable<Range> {
		add(range: Range): void;
		delete(range: Range): boolean;
		clear(): void;
		has(range: Range): boolean;
		readonly size: number;
		entries(): IterableIterator<[Range, Range]>;
		keys(): IterableIterator<Range>;
		values(): IterableIterator<Range>;
		forEach(
			callbackfn: (value: Range, key: Range, set: Highlight) => void,
			thisArg?: unknown,
		): void;
	}

	var Highlight: {
		prototype: Highlight;
		new (...init: Range[]): Highlight;
	};

	interface CSSHighlights extends Iterable<[string, Highlight]> {
		readonly size: number;
		clear(): void;
		delete(name: string): boolean;
		get(name: string): Highlight | undefined;
		has(name: string): boolean;
		set(name: string, value: Highlight): CSSHighlights;
		entries(): IterableIterator<[string, Highlight]>;
		keys(): IterableIterator<string>;
		values(): IterableIterator<Highlight>;
		forEach(
			callbackfn: (value: Highlight, key: string, map: CSSHighlights) => void,
			thisArg?: unknown,
		): void;
	}

	interface CSS {
		highlights: CSSHighlights;
	}
}

export {};
