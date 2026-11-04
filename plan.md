# M-Pesa STK Checkout

## Implementation

Build a self-contained Node.js web application on port 3000. The server serves the static frontend, exposes `POST /api/stk-push` for validated user requests, and receives Safaricom callbacks at `POST /api/callback`. Safaricom credentials remain in protected runtime environment variables and are never sent to the browser. The frontend uses plain HTML, CSS, and JavaScript so it is fast, portable, and easy to run locally.

The STK request is user-initiated rather than automatic at process startup. The server normalizes Kenyan phone numbers, validates the amount, obtains a Daraja OAuth token, signs the request with the configured passkey, and returns the Safaricom response. The Safaricom base URL is selected from the protected `MPESA_ENV` value, so the same code supports sandbox and production testing without exposing credentials. Production Till mode uses the M-Pesa Express/Lipa na M-Pesa Online `CustomerBuyGoodsOnline` transaction type with the Till as the business shortcode and Party B. Callback handling records the latest transaction outcome in memory for the current process and returns the accepted response expected by Safaricom. Production testing requires an explicitly configured public HTTPS callback URL and the production app must have the M-Pesa Express product enabled; the Business Buy Goods B2B product is a separate API.

## Project structure

- `server.js`: static file server, API routes, Safaricom OAuth/STK integration, and callback handling.
- `public/index.html`: accessible payment form and status layout.
- `public/styles.css`: responsive visual system and interaction states.
- `public/app.js`: client-side validation, request submission, and status updates.
- `public/manus-routes.json`: declared page routes for Preview.
- `TODO.md`: outcome-based delivery checklist.

## Design direction

### Alternative styles

- **Quiet fintech instrument** — 0.06 probability; precise, calm, and operational.
- **Kenyan editorial modernism** — 0.08 probability; warm, confident, and locally grounded.
- **Neon commerce console** — 0.04 probability; energetic, technical, and high-contrast.

### Chosen style: Kenyan editorial modernism

- **Design Movement:** Contemporary African editorial design translated into a focused fintech checkout.
- **Core Principles:** Clear hierarchy, tactile surfaces, warm confidence, and generous breathing room.
- **Color Philosophy:** Deep ink and forest green establish trust; a saffron accent carries the familiar M-Pesa energy without copying brand assets.
- **Layout Paradigm:** An asymmetric split composition with a narrow guidance rail and a dominant form panel, avoiding a generic centered card.
- **Signature Elements:** A numbered process rail, a rounded receipt-like payment panel, and a small signal badge that communicates sandbox state.
- **Interaction Philosophy:** Every action explains what happens next; validation is immediate, and success feels like a handoff to the phone.
- **Animation:** Subtle lift on focus and hover, a calm progress shimmer while waiting, and a restrained success pulse; no distracting motion.
- **Typography System:** `DM Sans` for interface text with `Space Grotesk` for display headings and numeric amounts.
- **Brand Essence:** A clear, trustworthy way to send a mobile payment prompt; focused, warm, dependable.
- **Brand Voice:** Headlines are direct and human. Example lines: “Send a prompt to your phone.” and “Approve it in M-Pesa to continue.”
- **Wordmark & Logo:** A compact “M” signal mark formed from two rising strokes beside the product name.
- **Signature Brand Color:** Saffron `#f2a900`, used as a precise action and highlight color against forest green.
