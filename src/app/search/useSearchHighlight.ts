"use client";

import { useEffect, type MutableRefObject } from "react";

const HIGHLIGHT_NAME = "search-result";
const HIGHLIGHT_STYLE_ID = "search-highlight-style";

type UseSearchHighlightOptions = {
	enabled?: boolean;
	dependencyKey?: unknown;
};

const hasHighlightSupport = () =>
	typeof window !== "undefined" &&
	typeof CSS !== "undefined" &&
	"highlights" in CSS &&
	typeof Highlight !== "undefined";

const normalizeForSearch = (value: string) => value.normalize("NFKC").toLocaleLowerCase();

const normalizeQueryTerm = (term: string) => normalizeForSearch(term.trim());

const normalizeTextWithMap = (value: string) => {
	const normalizedSegments: string[] = [];
	const startIndexMap: number[] = [];
	const endIndexMap: number[] = [];

	let codeUnitIndex = 0;
	for (const char of value) {
		const normalizedChar = normalizeForSearch(char);
		const charStart = codeUnitIndex;
		const charEnd = codeUnitIndex + char.length;
		normalizedSegments.push(normalizedChar);
		for (let i = 0; i < normalizedChar.length; i++) {
			startIndexMap.push(charStart);
			endIndexMap.push(charEnd);
		}
		codeUnitIndex = charEnd;
	}

	return {
		normalizedValue: normalizedSegments.join(""),
		startIndexMap,
		endIndexMap,
	};
};

export const useSearchHighlight = (
	ref: MutableRefObject<HTMLElement | null>,
	queryTerms: ReadonlyArray<string>,
	options: UseSearchHighlightOptions = {},
) => {
	const { enabled = true, dependencyKey } = options;

	useEffect(() => {
		if (!enabled || !hasHighlightSupport()) {
			return;
		}

		let styleEl = document.getElementById(HIGHLIGHT_STYLE_ID) as
			| HTMLStyleElement
			| null;
		if (!styleEl) {
			styleEl = document.createElement("style");
			styleEl.id = HIGHLIGHT_STYLE_ID;
			styleEl.textContent = `
:root ::highlight(${HIGHLIGHT_NAME}) {
  background-color: var(--color-accent);
  color: var(--color-accent-content);
}
:root :highlight(${HIGHLIGHT_NAME}) {
  background-color: var(--color-accent);
  color: var(--color-accent-content);
}
			`;
			document.head.appendChild(styleEl);
		}

		const element = ref.current;
		if (!element) {
			return;
		}

		const normalizedTerms = Array.from(
			new Set(
				queryTerms
					.map((term) => normalizeQueryTerm(term))
					.filter((term) => term.length > 0),
			),
		);

		if (normalizedTerms.length === 0) {
			return;
		}

		const highlights = CSS.highlights;
		let highlight = highlights.get(HIGHLIGHT_NAME);

		if (!highlight) {
			highlight = new Highlight();
			highlights.set(HIGHLIGHT_NAME, highlight);
		}

		let ranges: Range[] = [];

		const applyHighlight = () => {
			for (const range of ranges) {
				highlight?.delete(range);
			}
			ranges = [];

			const walker = document.createTreeWalker(
				element,
				NodeFilter.SHOW_TEXT,
				null,
			);

			while (walker.nextNode()) {
				const node = walker.currentNode as Text;
				const nodeValue = node.data;
				if (!nodeValue) {
					continue;
				}
				const { normalizedValue, startIndexMap, endIndexMap } =
					normalizeTextWithMap(nodeValue);

				if (normalizedValue.length === 0) {
					continue;
				}

				for (const normalizedTerm of normalizedTerms) {
					if (normalizedTerm.length === 0) {
						continue;
					}
					let searchIndex = 0;
					while (searchIndex < normalizedValue.length) {
						const foundIndex = normalizedValue.indexOf(
							normalizedTerm,
							searchIndex,
						);
						if (foundIndex === -1) {
							break;
						}
						const termEndIndex = foundIndex + normalizedTerm.length - 1;
						const rangeStart = startIndexMap[foundIndex];
						const rangeEnd = endIndexMap[termEndIndex];
						if (
							rangeStart === undefined ||
							rangeEnd === undefined ||
							rangeStart === rangeEnd
						) {
							searchIndex = foundIndex + normalizedTerm.length;
							continue;
						}

						const range = new Range();
						range.setStart(node, rangeStart);
						range.setEnd(node, rangeEnd);
						ranges.push(range);
						searchIndex = foundIndex + normalizedTerm.length;
					}
				}
			}

			for (const range of ranges) {
				highlight?.add(range);
			}
		};

		const observer = new MutationObserver(() => {
			applyHighlight();
		});

		applyHighlight();
		observer.observe(element, {
			subtree: true,
			childList: true,
			characterData: true,
		});

		return () => {
			observer.disconnect();
			for (const range of ranges) {
				highlight?.delete(range);
			}
			// leave style element in place for reuse
		};
	}, [ref, queryTerms, enabled, dependencyKey]);
};
