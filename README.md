# nos.today

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)

**nos.today** is a Nostr NIP-50 search web client. It provides full-text search of Nostr notes using NIP-50 compliant relays, with results streaming in real-time via the [rx-nostr](https://github.com/penpenpng/rx-nostr) reactive library.

🔍 **Live demo:** [https://nos.today](https://nos.today)

---

## Features

- **NIP-50 full-text search** — sends `search` filter queries to NIP-50 compliant relays
- **Real-time streaming results** — results stream in as they arrive via rx-nostr forward subscriptions
- **Pagination** — "More" button triggers backward requests to load older notes
- **User profile display** — kind-0 profile metadata fetched and batched from regular relays
- **Content highlighting** — matched search terms are highlighted using the CSS Custom Highlight API (with progressive fallback)
- **NIP-36 content warning support** — notes tagged with `content-warning` are gated behind a reveal button
- **nostr: URI rendering** — nostr: links are rendered as shortened bech32 labels with click-through
- **Content truncation** — long notes are clipped with expand/collapse controls
- **DOMPurify sanitization** — all rendered HTML is sanitized before insertion
- **Copy to clipboard** — one-click copy for author npub and note IDs
- **Responsive design** — built with Tailwind CSS + DaisyUI

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| UI framework | React | 19 |
| Language | TypeScript | 5.9 |
| Build tool | Vite | 7 |
| Styling | Tailwind CSS + DaisyUI | 4 / 5 |
| Nostr protocol | rx-nostr + rx-nostr-crypto | 3.6 / 3.1 |
| Nostr utilities | nostr-tools | 2.18 |
| Nostr types | nostr-typedef | 0.13 |
| Routing | react-router-dom | 7 |
| Date formatting | date-fns | 4 |
| Content sanitization | DOMPurify | 3 |
| Link rendering | linkifyjs + linkify-string | 4 |
| Icons | react-icons | 5 |
| WebSocket | reconnecting-websocket | 4.4 |

---

## Prerequisites

- **Node.js** 18 or later (current LTS recommended)
- **npm** (bundled with Node.js)

---

## Installation & Development

```bash
# Clone the repository
git clone https://github.com/darashi/nos.today.git
cd nos.today

# Install dependencies
npm install

# Copy the example environment config
cp .env .env.local
# (optional) edit .env.local to customize relay URLs

# Start the development server
npm run dev
```

The dev server starts at `http://localhost:5173` by default.

---

## Configuration

Relay URLs are configured via environment variables. Copy `.env` to `.env.local` and edit as needed:

```env
# NIP-50 compliant relays used for full-text search queries
VITE_SEARCH_RELAYS=wss://search.nos.today,wss://antiprimal.net/,wss://relay.ditto.pub

# Regular relays used for profile metadata (kind 0) lookups
VITE_REGULAR_RELAYS=wss://directory.yabu.me,wss://purplepag.es,wss://user.kindpag.es
```

### Relay Types

| Variable | Purpose |
|---|---|
| `VITE_SEARCH_RELAYS` | Relays that support the NIP-50 `search` filter. Search queries are sent exclusively to these. |
| `VITE_REGULAR_RELAYS` | Standard relays used only for fetching kind-0 profile metadata. Not queried for note search. |

Both variables accept comma-separated WebSocket relay URLs. All configured relays are listed on the [/about](https://nos.today/about) page at runtime.

---

## Building for Production

```bash
# Compile and bundle
npm run build

# Preview the production build locally
npm run preview
```

Output is written to `dist/`. The project is configured for deployment on [Vercel](https://vercel.com/) (see `vercel.json`), but the built output is a standard static site and can be served anywhere.

---

## Project Structure

```
nos.today/
├── src/
│   ├── App.tsx                    # Root component — defines routes (/, /about, /search)
│   ├── main.tsx                   # Entry point
│   ├── app/
│   │   ├── page.tsx               # Home page (search form)
│   │   ├── Navbar.tsx             # Sticky top navigation bar
│   │   ├── QueryForm.tsx          # Search input form component
│   │   ├── globals.css            # Global styles
│   │   ├── about/
│   │   │   └── page.tsx           # About page (relay list, attribution)
│   │   └── search/
│   │       ├── page.tsx           # Search page shell
│   │       ├── Search.tsx         # Core search logic and state management
│   │       ├── Note.tsx           # Note card component
│   │       ├── NoteContent.tsx    # Renders and sanitizes note HTML content
│   │       ├── SnippableContent.tsx # Truncates long notes with expand/collapse
│   │       ├── Avatar.tsx         # User avatar with loading skeleton
│   │       ├── Nip36Protection.tsx# NIP-36 content warning gate
│   │       └── useSearchHighlight.ts # Hook for CSS Custom Highlight API
│   └── lib/
│       ├── App.tsx                # AppProvider context: rx-nostr instance + current time
│       ├── config.ts              # Reads relay URLs from Vite env vars
│       └── renderer/
│           └── renderer.ts        # Content renderer: linkifyjs with nostr: URI support
├── .env                           # Default relay configuration (commit-safe defaults)
├── biome.json                     # Biome linter/formatter config
├── eslint.config.mjs              # ESLint config
├── jest.config.js                 # Jest test config
├── vite.config.ts                 # Vite build config (React plugin, @ path alias)
└── vercel.json                    # Vercel deployment config
```

---

## How It Works

1. **Search query** — the user types a query into the search form; the page navigates to `/search?q=<query>`.

2. **Forward subscription** — `Search.tsx` creates an rx-nostr forward request and emits a NIP-50 filter:
   ```json
   { "kinds": [1], "search": "<query>", "limit": 100 }
   ```
   This is sent to all configured `VITE_SEARCH_RELAYS`. Results stream in as they are received.

3. **Client-side verification** — because some relays return false positives, each event is filtered client-side: its content is NFKC-normalized and lowercased, then checked to contain all query terms before being added to the result set.

4. **Profile metadata** — each incoming event triggers a batched kind-0 profile request. Requests are buffered in 50 ms windows and merged into a single `{kinds: [0], authors: [...]}` query sent to regular relays.

5. **Pagination** — clicking "More" sends a backward request with `until: <oldest_visible_timestamp>`, appending older results.

6. **Rendering** — note content is processed through `renderer.ts`, which runs `linkifyjs` with a registered `nostr:` custom protocol. Long bech32 identifiers are abbreviated (`npub1abc123…xyz789`). The resulting HTML is sanitized by DOMPurify before being injected into the DOM.

7. **Highlighting** — matched query terms are highlighted using the [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API). On browsers without support, the text is still correct; highlighting is silently skipped.

8. **Content warnings** — notes tagged `["content-warning", "<reason>"]` (NIP-36) are hidden behind a confirmation button showing the reason. Users must explicitly click to reveal the content.

---

## Testing

```bash
npm test
```

Tests are run with [Jest](https://jestjs.io/) and `ts-jest`. Test files live alongside the source they test.

---

## Linting

```bash
# ESLint (style + type-aware rules)
npm run lint

# Biome (also configured for import organization and recommended lint rules)
npx biome check .
```

The project uses both **ESLint** (via `eslint.config.mjs`) and **Biome** (via `biome.json`) for code quality. ESLint handles TypeScript-aware rules; Biome handles import organization and additional lint recommendations.

---

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: describe your change"`
4. Push to your fork: `git push origin feature/your-feature`
5. Open a Pull Request

**Guidelines:**
- Keep PRs focused — one feature or fix per PR
- Ensure `npm run lint` and `npm test` pass before submitting
- Follow the existing code style (TypeScript strict, functional React components)
- If adding a new relay or changing defaults, update the `.env` file accordingly

---

## License

[MIT](LICENSE)

---

## Author

nos.today and the companion [search.nos.today](https://github.com/darashi/searchnos) relay are built by
[@darashi](nostr:npub1q7qyk7rvdga5qzmmyrvmlj29qd0n45snmfuhkrzsj4rk0sm4c4psvqwt9c)
(`npub1q7qyk7rvdga5qzmmyrvmlj29qd0n45snmfuhkrzsj4rk0sm4c4psvqwt9c`)
