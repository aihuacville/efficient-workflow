# Efficient Workflow

A **job dispatch system** that customers, field staff, business owners and dispatchers can all use from their **phone or laptop**.

---

## Goal

Build one web app that works well on both phones and laptops, so every role can use the device that suits their work, with no separate mobile app or mobile site to maintain.

## Design approach

The app uses **responsive web design**: one website that adapts its layout to the screen it's on. It is built **mobile-first** and made into a **Progressive Web App (PWA)**.

| Term | What it means | Why it matters here |
|---|---|---|
| **Responsive web design** | One codebase and one URL. The layout reflows with screen width using flexible grids and CSS breakpoints. | Phone and laptop users get the same app, with no separate mobile site |
| **Mobile-first** | Design for the small screen first, then add layout for larger screens | Customers arrive from a QR code on their phone, and field staff work on phones |
| **Progressive Web App (PWA)** | A website that can be installed to the home screen, works partly offline, and can send push notifications | Staff get an app-like experience without the App Store |

## Roles and devices

| Role | Main device | Design focus |
|---|---|---|
| **Customer** | Phone (QR code) | One step at a time, big tap targets, the camera opens directly, no sign-up wall |
| **Technician** (field staff) | Phone | Today's jobs as a list, one-tap status updates, photo upload, tolerates a poor signal |
| **Business owner** | Both | Cards on the phone; a table or calendar view on a laptop. Accepts jobs and assigns technicians |
| **Dispatcher / admin** | Laptop | Information-dense: tables, filters, a map, several panels side by side. Approves the machine's suggested business for each request |

**Dispatch keeps a human in the loop.** The system ranks businesses for each request and suggests one, with the reasons ("offers this service, closest, best rated"). The dispatcher approves it with one tap or chooses another. Nothing is offered to a business without a person's approval. The ranking uses simple scoring rules (service offered, distance, rating, free time) rather than AI, so it's predictable and easy to explain.

The layout differs a lot by role, but it stays one app. A dispatcher's queue can be a table on a laptop and a stack of cards on a phone, built from the same data and components.

## Design rules

- **Breakpoints:** design at about 375px (phone), 768px (tablet) and 1200px+ (laptop).
- **Navigation:** a bottom tab bar or menu button on phones, a sidebar on laptops.
- **Touch:** buttons at least 44–48px tall, primary actions within thumb reach, no actions that rely on hover.
- **Forms:** use the right input types (`tel`, `email`, `date`) so the phone shows the right keyboard, plus `capture="environment"` to open the camera.
- **Performance:** phones on mobile data are the slowest case. Keep the customer pages light and test on a mid-range phone.
- **PWA features:** add them in this order: an installable manifest, offline caching of the staff job list, then push notifications.
- **Before coding a screen:** sketch it twice, once for phone and once for laptop.

## Out of scope for now

- **Native iOS/Android apps.** Only worth it for deep device features such as background location tracking, reliable background sync, or App Store presence. A PWA covers the first versions.
- **A separate mobile site** (`m.example.com`, sometimes called adaptive design). It means two designs to maintain, and responsive design replaces it.

## Planned stack

**Next.js + Material UI (MUI).** MUI's breakpoints and responsive props handle the layout changes, for example `sx={{ display: { xs: "none", md: "block" } }}` and `Stack direction={{ xs: "column", sm: "row" }}`. Next.js supports a PWA manifest natively (`app/manifest.ts`).

**One Next.js app, at the repo root.** The website and the server code (API endpoints, form handling, permission checks, the AI call) live in the same app, and Vercel hosts both. Other needs plug in as services rather than separate servers: Postgres (Neon) for data, and later sign-in, email and text messages, photo storage, error alerts and background jobs. See [Decisions](#decisions).

**Folder layout:**

| Folder | What's in it |
|---|---|
| `app/` | Pages and API endpoints. `(public)` holds customer pages; `(app)` holds dispatcher, owner and technician pages inside the app shell; `api/` holds server endpoints |
| `components/` | Shared UI: app shell, page header, table-or-cards list, rating, reviews |
| `theme/` | MUI theme: colors, breakpoints, touch-target sizes |
| `lib/` | Server and business logic as it arrives, one folder per area (for example `lib/orders/`, `lib/dispatch/`), so any area could become its own package later |
| `docs/` | QR codes and other project files |

## Run locally

You need Node 22 or newer (check with `node -v`). From the repo root:

```bash
corepack enable   # first time only: gives you the pnpm version the repo pins
pnpm install      # install dependencies
pnpm dev          # start the dev server
```

Then open http://localhost:3000. Press `Ctrl+C` to stop the server.

| Page | What it shows |
|---|---|
| `/` | Customer landing page |
| `/request` | Customer request form (placeholder until Wednesday) |
| `/dispatch` | Dispatcher queue (sample data for now) |
| `/jobs` | Business owner's job offers |
| `/track/demo` | Sample tracking page with the rating (turn on "Demo: show rating") |

**To check the phone layout:**
- **In Chrome on your laptop:** open DevTools (`Cmd+Option+I`), then turn on the device toolbar (`Cmd+Shift+M`) and pick an iPhone.
- **On a real phone:** connect it to the same Wi-Fi as your laptop. Then open the `Network:` address that `pnpm dev` prints (like `http://192.168.x.x:3000`).

**Other commands:** `pnpm typecheck`, `pnpm build`, `pnpm format`.

## Exploring the server: the ratings endpoint

A small, self-contained example of server-side code, added to explore how the backend works. The rating on `/track/demo` sends each rating to the server, which checks it, saves it and replies with JSON.

**Where the code is:** [app/api/ratings/route.ts](app/api/ratings/route.ts). In Next.js, a `route.ts` file inside `app/api/` is a **Route Handler**: server code that runs when someone calls that URL. It never reaches the browser, so it's the place for checks, secrets and saving data. There's no separate server to run or deploy.

**The flow:**

```
Phone: tap 4 stars, type a comment, tap Send rating
   │  POST /api/ratings
   │  { "stars": 4, "comment": "On time and friendly." }
   ▼
Server: checks the input → adds it to ratings.json → replies
   │  201 Created
   │  { "id": "r_7cbd550e", "stars": 4, "comment": "On time and friendly.",
   │    "createdAt": "2026-10-28T21:32:31.681Z",
   │    "message": "Thanks! Your 4-star rating was saved." }
   ▼
Phone: shows "Thanks! Your 4-star rating was saved." (the server's message)
```

**The two endpoints:**

| Request | What it does | Replies |
|---|---|---|
| `POST /api/ratings` with `{ "stars": 1-5, "comment": "optional" }` | Saves one rating | `201` with the saved rating and a `message`, or `400` with an `error` |
| `GET /api/ratings` | Lists every saved rating, newest first | `200` with `{ "ratings": [...] }` |

**Try it** (with `pnpm dev` running):

1. **In the browser:** open http://localhost:3000/track/demo, turn on **Demo: show rating**, pick stars and send. Under the thank-you, **All reviews** appears: the page calls `GET /api/ratings` and shows every review, newest first, with the average ([ReviewList.tsx](components/ReviewList.tsx)). Open http://localhost:3000/api/ratings to see the same data as raw JSON.
2. **From the terminal, with no browser.** `curl` sends a request directly:

   ```bash
   # Save a rating
   curl -X POST http://localhost:3000/api/ratings \
     -H "Content-Type: application/json" \
     -d '{"stars": 4, "comment": "On time and friendly."}'

   # Bad input: the server refuses it with 400 and an error message
   curl -X POST http://localhost:3000/api/ratings \
     -H "Content-Type: application/json" \
     -d '{"stars": 7}'

   # List all ratings
   curl http://localhost:3000/api/ratings
   ```

3. **Look at the saved file:** [data/ratings.json](data/ratings.json). Git ignores it, so test ratings aren't committed. Delete it to start over.
4. **Watch the server side:** the terminal running `pnpm dev` logs each request, for example `POST /api/ratings 201 in 12ms`. Add a `console.log(...)` inside `route.ts` and it prints there, not in the browser. That's how you can tell the code runs on the server.

**What it teaches:**
- **Never trust the browser.** The form already limits stars to 1–5, but anyone can call the URL directly with `curl`. So the server checks every field itself and replies `400` with a clear `error` when something's wrong.
- **Status codes carry meaning:** `201` saved, `400` your input is wrong, `200` here's what you asked for. The page uses `res.ok` to decide between showing the thank-you or the error.
- **The page and server agree on a JSON shape.** That shape is the contract. Behind it, the storage can change without the page noticing.

**Limits (it's an exploration, not the final design):**
- **Storage is a JSON file**, so it works on one computer only. On Vercel the disk is read-only except `/tmp`, which is wiped regularly, so ratings on the live site don't last.
- **Postgres replaces the file** in the data work this week. The URL and JSON shape stay the same, so the page won't need to change.
- **Not linked to a job yet.** Real ratings will belong to an order, and only that order's customer can rate it.

## Live demo

The app is live at **https://workflow.aihuachen.com**. Vercel deploys every push to `main`.

QR codes are in [docs/qr/](docs/qr/):

| File | Opens | Use it for |
|---|---|---|
| [workflow-request.png](docs/qr/workflow-request.png) | `https://workflow.aihuachen.com/request` | The demo: scanning opens the request form directly |
| [workflow-request.svg](docs/qr/workflow-request.svg) | the same | Slides and print (sharp at any size) |
| [workflow-home.png](docs/qr/workflow-home.png) | `https://workflow.aihuachen.com` | The landing page, as a colorful poster ("Scan me. We've got this!") for slides and printouts |
| [workflow-home.svg](docs/qr/workflow-home.svg) | the same | Editable version of the poster. Prefer the PNG: the SVG's emoji and font depend on the device |

The codes hold the address directly, with no redirect service, so they never expire. To make a new one:

```bash
npx qrcode@1.5.4 -w 1024 -m 2 -e M -o docs/qr/name.png "https://workflow.aihuachen.com/path"
```

## Decisions

### Styling: keep MUI + Emotion for the demo (decided Oct 27, 2026)

**Decision:** use MUI with its built-in styling (Emotion) for the demo MVP. Style only through the theme ([theme.ts](theme/theme.ts)) and `sx` props, with no separate stylesheets. Look at this again after the demo.

**What it costs.** From a production build on Oct 27. The figures are the compressed JavaScript a phone downloads on its first visit:

| Page | First load | Of which Next.js + React | Of which MUI + Emotion |
|---|---|---|---|
| `/` (landing) | 146 kB | 103 kB | ~43 kB |
| `/request` | 133 kB | 103 kB | ~30 kB |
| `/dispatch` | 153 kB | 103 kB | ~50 kB |

The 103 kB baseline is the same with any CSS approach, so a switch would save only part of the 30–50 kB per page. That's roughly a quarter of a second on decent mobile data.

**Options considered:**

| Approach | Pros | Cons |
|---|---|---|
| **MUI + Emotion** (chosen) | Ready-made responsive parts: sidebar, bottom tab bar, tables, dialogs, date pickers. Good for dense dispatcher screens | Styles are generated in the browser at runtime, so there's some extra JavaScript |
| **Tailwind CSS + shadcn/ui** | The most popular choice for new Next.js apps. No runtime styling cost, so pages are smaller. We'd own the component code | More to build ourselves. Fewer ready-made data-heavy components (data grid, date picker) |
| **CSS Modules** (plain CSS files) | No extra cost, and built into Next.js | We'd write every component and responsive rule ourselves. Too slow for a five-day sprint |

**Why MUI for now:**
- Switching would cost about a day out of five.
- Thursday and Friday need forms, dialogs, a date and time picker for scheduling visits, and a dispatcher table. MUI already has all of them.
- The responsive shell is built and tested on phone and laptop.
- The main performance risk is the customer pages on mobile data, and those are already the smallest pages.

**When to reconsider:** after the demo, if testing on a mid-range phone shows the customer pages feel slow. Then move only those pages (`/`, `/request`, the tracking page) to plain CSS or Tailwind, and keep MUI for the dispatcher and owner screens. No full rewrite is needed. Styling only through the theme and `sx` keeps that move manageable.

### Repo structure: a single Next.js app, no monorepo (decided Oct 29, 2026)

**Decision:** flatten the repo from a pnpm + Turborepo monorepo (`apps/web`, `packages/config`) to one Next.js app at the root.

**Why:**
- The monorepo had one app and one small package that only held TypeScript settings, so Turborepo was coordinating one thing.
- One app means one `package.json`, one `tsconfig.json`, default Vercel settings, and `pnpm add x` with no decision about where a library belongs.
- It's easier to understand for a small team, and cheaper to change now than after the database code lands.

**Is Next.js enough for the real product?** Yes. The example checked: 100 lawn care businesses, each with 10 workers and 20 clients, comes to about 3,100 users. With weekly visits, that's about 8,000 jobs a month (~300 a day) and a few tens of thousands of requests a day, a small fraction of what Next.js on Vercel handles. What matters at that size:
- **Neon's pooled connection,** because many short-lived server functions each open a database connection.
- **One shared app for all businesses:** every row records which business it belongs to, and every query checks it. This goes into the data model from the start.
- **Photos in file storage** (Vercel Blob or Cloudflare R2), not in the database.
- **Text message costs,** which outgrow hosting and database costs combined.

**When to reconsider:**
- **A native iPhone or Android app,** or a separate background worker that shares code with the website. Then a monorepo (and Turborepo) earns its place again.
- **Live GPS tracking of many workers on a map** needs a real-time service (Pusher, Ably, or Supabase Realtime), because Vercel can't hold open live connections. A tracking page that refreshes every 30 seconds needs nothing extra.

Keeping business logic in `lib/<area>/` folders means any area can become a package later without a rewrite.

### Database: Neon for the demo; consider Supabase for the pilot (decided Oct 29, 2026)

Both are hosted Postgres, and the app talks to the database only through Prisma, so switching means changing a connection string and copying the data.
- **Neon** is just Postgres: built into Vercel, with database copies per branch and close to free when idle. It's already set up, and the demo needs nothing more.
- **Supabase** is Postgres plus sign-in, file storage and live updates in one product. That could save a small team work in the pilot. The cost is more lock-in if the app builds on those extras.

Decide after the demo, based on how soon the pilot needs sign-in, photos and live updates.

### CMS: Payload for marketing pages only, later (decided Oct 29, 2026)

**Decision:** don't use a CMS for the app itself. Payload is a good fit later for **marketing pages, FAQs and help articles** that people who don't code need to edit.

**Why not for the app:**
- The app's hard parts are workflow: the order state machine, dispatch scoring, offers, scheduling and permissions. A CMS is built for editing content, so it wouldn't help with those.
- Payload creates and manages its own database tables, and Prisma already owns the app's tables. With two tools defining the same database, migrations get confusing.

**When added:** keep Payload's content apart from order data, either in separate tables or in a separate small marketing site.

## Build plan

As a small team, we build a **demo MVP in five days** and present it on **Monday, Nov 2, 2026**. That presentation replaces the prototype round: it's where we find out whether people understand it and want it. If they do, we harden it into a **pilot** with real customers and businesses.

| | **Demo MVP** | **Pilot** |
|---|---|---|
| **Purpose** | Show the full loop working, and get feedback | Find out whether it works with real jobs |
| **What it is** | A deployed app with demo accounts and demo data | The same app with real sign-in, notifications and safeguards |
| **Who uses it** | The audience on Monday, watching a live demo | A few real customers and 1–3 real businesses |
| **When** | Tue Oct 27 – Sun Nov 1, 2026 | After the demo, depending on feedback |

### Demo MVP scope

The demo shows the core loop, **request → dispatch → job done**, live on phones and a laptop. It features three roles, with the dispatcher shown briefly in between:

1. **Customer (phone):** scan a QR code → photo of a notice → AI fills in the form → confirm → tracking page.
2. **Dispatcher (laptop, briefly):** the system suggests a business with its reasons → the dispatcher approves the offer.
3. **Business owner (laptop):** accepts the job → schedules the visit → assigns a technician.
4. **Technician (phone):** sees today's jobs → taps On my way → Started → Done, with an optional photo of the finished work.
5. **Customer (phone):** the tracking page updates at each step → confirms the work → rates the business.

**Cut from the demo** (shown as "next steps" in the presentation):
- **Real sign-in:** a demo account switcher stands in for it.
- **Email and text notifications:** status changes show on the tracking page instead.
- **Fully automatic dispatch** (offers sent without approval, with timeouts), **payments, and PWA features** such as offline mode and push notifications.

### Pilot success criteria

Set before the pilot so the result isn't a matter of opinion. By the end of the pilot:
- [ ] 20 or more real requests submitted
- [ ] Most offers accepted by a business within a day
- [ ] Customers complete the form without help
- [ ] At least one business asks to keep using it

---

## TODO and timeline

### Sprint: Demo MVP (Tue Oct 27 – Sun Nov 1, 2026)

Deploying on **Friday**, not Sunday, leaves two days to fix hosting problems. Sunday after noon is for fixes and rehearsal only.

**Tue Oct 27: Workspace and app shell**
- [x] Workspace: pnpm, Turborepo, TypeScript, Next.js, MUI
- [x] Responsive app shell: theme, breakpoints, navigation (bottom bar on phones, sidebar on laptops)
- [x] Landing page: a line on what to expect (matched within a day, tracking page)
- [x] Rating component: five stars and an optional comment, previewed at `/track/demo` with a "Demo: show rating" switch
- [x] *You:* create accounts and sign in: GitHub, Vercel, Neon (hosted Postgres), Anthropic API key

**Wed Oct 28: Data and customer flow**
- [ ] Postgres + Prisma, local setup with Docker
- [ ] Data model and order state machine, with tests
- [ ] Customer request form that saves real orders
  - [ ] Step indicator at the top: 1 Photo → 2 Check details → 3 Contact info ("Step 2 of 3" on phones)
  - [ ] The final button says what happens next: "Send request. We'll find a business for you."
- [ ] Customer tracking page
  - [ ] Status timeline: Request received → Business assigned → Visit scheduled → Technician on the way → Work done → You confirm
  - [ ] Each step shows its date, plus the business name and visit time once known; the current step is highlighted
- [ ] After submitting: show the tracking link with a **Copy link** button and "Save this link to check progress" (no sign-in for customers, and no email until the pilot)
- [ ] *You:* review the phone screens

**Thu Oct 29: AI autofill and dispatch**
- [x] Flatten the repo to a single Next.js app (see [Decisions](#repo-structure-a-single-nextjs-app-no-monorepo-decided-oct-29-2026))
- [ ] *You:* in Vercel, set **Settings → Build and Deployment → Root Directory** back to empty (it was `apps/web`)
- [ ] AI autofill from a photo of the notice
- [ ] Dispatcher page: queue of new requests, offer a job to a business, cancel
- [ ] Suggested business for each request (human in the loop)
  - [ ] Scoring rules: offers the service, distance, rating, free time; tested
  - [ ] Show the suggestion with its reasons; **Approve offer** in one tap, or **Choose another**
- [ ] *You:* find 2–3 real notice photos for the demo

**Fri Oct 30: Owner and technician flow, first deploy**
- [ ] Demo account switcher (dispatcher, owner, technician, customer)
- [ ] Owner page: accept or decline, schedule a visit, assign a technician
- [ ] Technician page (phone): today's jobs; On my way → Started → Done; optional photo of the finished work
- [ ] Customer confirms the work is done, or reports a problem
- [ ] Rating appears on the tracking page after the customer confirms, and is saved; the owner sees the stars on the job
- [ ] Demo switch for the rating shows only in demo mode, as a backup; remove the `/track/demo` sample page
- [ ] **First production deploy** (Vercel + Neon)
- [ ] *You:* test the live link on your phone

**Sat Oct 31: Polish**
- [ ] Phone and laptop layout polish
- [x] QR code that opens the request page ([docs/qr/](docs/qr/))
- [ ] Demo data
- [ ] Spending limit on the API key; password-protect the demo link
- [ ] Bug fixes
- [ ] *You:* full run-through

**Sun Nov 1: Freeze and rehearse**
- [ ] Code freeze at noon; only fixes after that
- [ ] Final rehearsal on a real phone and laptop: customer on one phone, technician on a second phone, owner and dispatcher on the laptop
- [ ] Record a screen video of the full flow as a backup
- [ ] *You:* slides, and a phone hotspot in case the Wi-Fi is bad

**Mon Nov 2: Demo** 🎤

### After the demo: Pilot readiness (based on feedback)

- [ ] Real sign-in for owners and admins
- [ ] Email notifications at each step
- [ ] Rate limiting on public endpoints, and storing notice photos
- [ ] Integration tests for orders and permissions
- [ ] Onboard 1–3 businesses in one city, print QR codes, run a 6-week pilot

### Later (based on the pilot)

- [ ] Payments: Stripe (including Apple Pay), and payouts to businesses
  - [ ] Add "Paid" (with an emailed receipt) as a step on the tracking page
- [ ] Automatic dispatch for routine jobs: send the top suggestion without approval, with offer timeouts and fallback to the next business. The dispatcher still handles exceptions, and the approval mode stays available
- [ ] Learn from dispatcher overrides: when the dispatcher picks a business other than the suggestion, record why and tune the scoring
- [ ] Text message notifications
- [ ] Technician view: route for the day, customer contact, checklists
- [ ] Real-time tracking: the customer's tracking page and the owner's map update live as technicians move and change status
  - [ ] First step: refresh the tracking page every 30 seconds (no new service needed)
  - [ ] Then live updates and GPS positions through a real-time service (Pusher, Ably or Supabase Realtime), sending location only while a technician is on the way, with their consent
- [ ] Payload CMS for marketing pages, FAQs and help articles, kept apart from order data (see [Decisions](#cms-payload-for-marketing-pages-only-later-decided-oct-29-2026))
- [ ] PWA: installable app, offline job list for technicians, push notifications
- [ ] Passkey sign-in
- [ ] Google Sheets sync for owners
- [ ] Admin reports and AI assistant
- [ ] More service types and cities
