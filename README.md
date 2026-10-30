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
| `lib/` | Server and business logic, one folder per area (for example `lib/orders/`, `lib/dispatch/`), so any area could become its own package later. `lib/db.ts` is the shared database client; `lib/generated/` is Prisma's generated code (not committed) |
| `prisma/` | `schema.prisma` (the data model) and `migrations/` (every change to the tables, as SQL files) |
| `docs/` | QR codes and other project files |

## Run locally

You need Node 22 or newer (check with `node -v`).

**Database connection (once per laptop).** Local development uses the Neon **`dev` branch**, never the live database. No Docker needed.
1. In the Neon console, open the project → **Branches** → **`dev`** → **Connect**, and copy the **pooled** connection string (its host contains `-pooler`).
2. Create `.env.local` at the repo root with `DATABASE_URL="<that string>"`. Git ignores this file. Never commit it or paste it into chat, because it contains the password.

Then, from the repo root:

```bash
corepack enable   # first time only: gives you the pnpm version the repo pins
pnpm install      # install dependencies
pnpm db:seed      # first time only: adds the demo businesses, staff and jobs to the dev database
pnpm dev          # start the dev server
```

Then open http://localhost:3000. Press `Ctrl+C` to stop the server.

| Page | What it shows |
|---|---|
| `/` | Customer landing page |
| `/request` | Customer request form: photo, details, contact info; saves a real order and shows its tracking link |
| `/dispatch` | Dispatcher page (as Dana Lee): new requests, offers waiting for a business, jobs in progress; offer, withdraw, cancel |
| `/jobs` | As an owner (Omar, Grace): offers, jobs to schedule, scheduled visits, jobs waiting for the customer, finished jobs with stars. As a technician (Alex, Jordan, Chris): their visits, with On my way → Start work → Done |
| `/track/<link>` | A customer's tracking page: timeline, business and visit time, and the rating once they've confirmed. Send a request at `/request` to get a link |
| `/track/demo` | The demo job's tracking page, with the rating (turn on "Demo: show rating") |

**To check the phone layout:**
- **In Chrome on your laptop:** open DevTools (`Cmd+Option+I`), then turn on the device toolbar (`Cmd+Shift+M`) and pick an iPhone.
- **On a real phone:** connect it to the same Wi-Fi as your laptop. Then open the `Network:` address that `pnpm dev` prints (like `http://192.168.x.x:3000`).

**Staff pages and the account switcher:** open `/dispatch` or `/jobs` and use the switcher (bottom of the sidebar on laptops, top bar on phones) to be anyone in the demo:

| Person | Role | Business |
|---|---|---|
| Dana Lee | Dispatcher | (the platform) |
| Omar Hassan | Owner | ABC Fire Safety |
| Alex Kim, Jordan Patel | Technicians | ABC Fire Safety |
| Grace Liu | Owner | GreenLeaf Lawn Care |
| Chris Moore | Technician | GreenLeaf Lawn Care |

There are no passwords: the switcher sets a cookie saying who you are ([lib/session.ts](lib/session.ts)). That's fine for a demo but not for real use, so real sign-in replaces it in the pilot, and the live demo link gets a password on Saturday.

**To try the request form:**
1. Open `/request` (on a phone, use the `Network:` address). Try tapping **Next** with empty fields, a phone number with too few digits, and **Back**: your answers stay.
2. Send it. **Copy link** copies the tracking link. On a phone over Wi-Fi it selects the link instead ("Press and hold the link to copy it"), because the clipboard only works over https or on localhost.
3. See what was saved: run `pnpm db:studio` and open **Order** (status `NEW`, with its tracking token), **Customer**, and **OrderEvent** (one "Request received" entry, `toStatus: NEW`). Delete test rows there if you like: deleting an order also deletes its events, but delete the customer separately. If you delete the ABC Fire Safety demo rows, `pnpm db:seed` puts them back.

**Other commands:** `pnpm test` (run the tests once; `pnpm test:watch` reruns them as you edit), `pnpm typecheck`, `pnpm build`, `pnpm format`.

**Database commands** (they use the `dev` branch from `.env.local`):

| Command | What it does |
|---|---|
| `pnpm db:migrate` | After changing `prisma/schema.prisma`: creates a migration file and applies it to `dev`. Add `--name what_changed` to name it |
| `pnpm db:seed` | Adds the demo data: two businesses (ABC Fire Safety, GreenLeaf Lawn Care), six staff for the account switcher, a confirmed job to rate (`/track/demo`) and three past reviews. Run it again to reset the demo; jobs you created yourself are kept |
| `pnpm db:studio` | Opens Prisma Studio in the browser to see and edit the data |
| `pnpm db:deploy` | Applies saved migrations without creating new ones. Used for `main` at deploy time |

**Updating the live database (`main`).** Vercel deploys the code on every push to `main`, but it doesn't change the database. When a commit adds a migration, or the live demo data needs resetting, run these from your laptop **before pushing**:

1. In the Neon console, open the project → **Branches** → **`main`** → **Connect**, turn **Connection pooling off** (the host must not contain `-pooler`), and copy the connection string.
2. In your terminal, at the repo root (zsh). `read -s` keeps the string off the screen and out of your shell history:

   ```bash
   read -rs "MAIN_URL?Paste main's connection string: "; echo
   DATABASE_URL_UNPOOLED="$MAIN_URL" pnpm db:deploy   # create or update the tables
   DATABASE_URL_UNPOOLED="$MAIN_URL" pnpm db:seed     # add or reset the demo data
   unset MAIN_URL
   ```

Both commands use `DATABASE_URL_UNPOOLED` when it's set, and a variable typed on the command line wins over `.env.local`, so they go to `main`, not `dev`. Never paste the string into chat or commit it.

`pnpm install` also runs `prisma generate`, which rebuilds the typed client in `lib/generated/` from the schema.

## Exploring the server: the ratings endpoint

A small example of server-side code, first added to explore how the backend works. The rating on `/track/demo` sends each rating to the server, which checks it, saves it in Postgres and replies with JSON.

**Where the code is:**
- [app/api/ratings/route.ts](app/api/ratings/route.ts): the **Route Handler**. In Next.js, a `route.ts` file inside `app/api/` is server code that runs when someone calls that URL. It never reaches the browser, so it's the place for checks, secrets and saving data. There's no separate server to run or deploy.
- [lib/ratings/input.ts](lib/ratings/input.ts): checks the input. It has no database code, so [its tests](lib/ratings/input.test.ts) run in `pnpm test`.
- [lib/ratings/queries.ts](lib/ratings/queries.ts): reads and writes the `Rating` table with Prisma.

**The flow:**

```
Phone: tap 4 stars, type a comment, tap Send rating
   │  POST /api/ratings
   │  { "trackingToken": "demo", "stars": 4, "comment": "On time and friendly." }
   ▼
Server: checks the input → finds the job by its tracking token → checks it's confirmed
        → saves the rating in Postgres → replies
   │  201 Created
   │  { "id": "cmvu6o0jk…", "stars": 4, "comment": "On time and friendly.",
   │    "createdAt": "2026-10-29T23:37:25.953Z",
   │    "message": "Thanks! Your 4-star rating was saved." }
   ▼
Phone: shows "Thanks! Your 4-star rating was saved." (the server's message)
```

**Rules:**
- **A rating belongs to a job.** The customer proves the job is theirs with its **tracking token**, the secret part of their tracking link. Customers don't sign in, so the token is their key.
- **Only after the customer confirms the work is done.** Before that, the server refuses.
- **One rating per job.** Rating again changes the earlier rating, and the server replies "Your rating was changed to 5 stars."

**The two endpoints:**

| Request | What it does | Replies |
|---|---|---|
| `POST /api/ratings` with `{ "trackingToken": "...", "stars": 1-5, "comment": "optional" }` | Saves the job's rating, or changes it | `201` saved, `200` changed, `400` bad input, `404` no job with that token, `409` the job isn't confirmed yet |
| `GET /api/ratings?businessId=...` | Lists a business's reviews, newest first | `200` with `{ "ratings": [...] }` |

**Try it** (run `pnpm db:seed` once first, then `pnpm dev`):

1. **In the browser:** open http://localhost:3000/track/demo, turn on **Demo: show rating**, pick stars and send. Under the thank-you, **All reviews** appears, with the demo business's three past reviews and yours ([ReviewList.tsx](components/ReviewList.tsx)). Open http://localhost:3000/api/ratings?businessId=demo_abc_fire to see the same data as raw JSON.
2. **From the terminal, with no browser.** `curl` sends a request directly:

   ```bash
   # Save a rating (send it again with other stars to change it)
   curl -X POST http://localhost:3000/api/ratings \
     -H "Content-Type: application/json" \
     -d '{"trackingToken": "demo", "stars": 4, "comment": "On time and friendly."}'

   # Bad input: the server refuses it with 400 and an error message
   curl -X POST http://localhost:3000/api/ratings \
     -H "Content-Type: application/json" \
     -d '{"trackingToken": "demo", "stars": 7}'

   # A job that doesn't exist: 404
   curl -X POST http://localhost:3000/api/ratings \
     -H "Content-Type: application/json" \
     -d '{"trackingToken": "nope", "stars": 5}'

   # List the demo business's reviews
   curl "http://localhost:3000/api/ratings?businessId=demo_abc_fire"
   ```

3. **Look at the saved rows:** run `pnpm db:studio` and open the **Rating** table. Run `pnpm db:seed` to reset the demo.
4. **Watch the server side:** the terminal running `pnpm dev` logs each request, for example `POST /api/ratings 201 in 120ms`. Add a `console.log(...)` inside `route.ts` and it prints there, not in the browser. That's how you can tell the code runs on the server.

**What it teaches:**
- **Never trust the browser.** The form already limits stars to 1–5, but anyone can call the URL directly with `curl`. So the server checks every field itself and replies `400` with a clear `error` when something's wrong.
- **Status codes carry meaning:** `201` created, `200` OK, `400` your input is wrong, `404` not found, `409` not allowed in the job's current state. The page uses `res.ok` to decide between showing the thank-you or the error.
- **Keep the checks apart from the database.** Plain functions are quick to test; database code is tested by running it.

**History:** the first version saved ratings to a JSON file (`data/ratings.json`), which only worked on one computer and was wiped regularly on Vercel. It moved to Postgres on Oct 29. If you still have `data/ratings.json`, you can delete it.

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

### Local database: a Neon `dev` branch instead of Docker (decided Oct 29, 2026)

**Decision:** develop against a **`dev` branch** of the Neon project, not a Postgres container in Docker Desktop.

```
Neon project
 ├─ main branch  ← Vercel / workflow.aihuachen.com
 └─ dev branch   ← your laptop's `pnpm dev`, via DATABASE_URL in .env.local
```

**Why:**
- **Nothing to install or keep running.** In the earlier build, Docker caused trouble: the PostGIS image had no build for Apple-chip Macs, and the database got extensions Prisma didn't expect.
- **The same Postgres version and settings** in development and live, so there are no "works on my laptop" surprises.
- **Still separate from live data:** a bad migration or a test script that deletes rows only touches `dev`. The `dev` branch can be reset from `main` at any time.
- **Free:** branches are included in Neon's free plan.

**Trade-offs:** development needs internet, and each query is a few milliseconds slower than a local database. Automated tests that need a database can use their own Neon branch, or a local Postgres if that becomes a problem.

### Data access layer: Prisma (decided Oct 29, 2026)

**Decision:** the app reads and writes Postgres through **Prisma**, an ORM (object-relational mapper). Prisma isn't required, since the app could talk to Postgres directly, but it's the best fit for this team and timeline.

**What this layer does:** it sits between the app's code and the database. It defines the tables, changes them safely over time (migrations), and turns queries into typed function calls, so a typo in a column name fails while writing code instead of in front of a customer.

**Options considered:**

| Option | What it is | Pros | Cons |
|---|---|---|---|
| **Plain SQL** (`pg` or `@neondatabase/serverless` driver) | Write SQL strings directly | Nothing to learn but SQL; no extra tools | No automatic types, so mistakes show up only when the app runs. Migrations are up to us |
| **Prisma** (chosen) | A readable schema file; Prisma generates the tables, migrations and a typed client | **The easiest schema to read**, solid migrations, **Prisma Studio** to browse data, the most widely used | One more tool with its own config and generated code. It had some setup friction in the earlier build |
| **Drizzle** | Tables defined in TypeScript; queries look like SQL | Light and fast, close to SQL, fits serverless well | Schema and queries are more verbose; younger tooling |

**The same query in each,** "the 10 newest orders for one business":

```ts
// Plain SQL: TypeScript doesn't know the result's shape
await sql`SELECT * FROM "Order" WHERE "businessId" = ${id} ORDER BY "createdAt" DESC LIMIT 10`;

// Prisma: reads like English, fully typed
await prisma.order.findMany({ where: { businessId: id }, orderBy: { createdAt: "desc" }, take: 10 });

// Drizzle: SQL-shaped, fully typed
await db.select().from(orders).where(eq(orders.businessId, id)).orderBy(desc(orders.createdAt)).limit(10);
```

**Why Prisma:**
- **The schema doubles as documentation:** the whole data model is readable in one file, `prisma/schema.prisma`.
- **Prisma Studio** (`pnpm prisma studio`) shows and edits the data in a browser, which is handy for checking demo data.
- **Migrations are saved files,** applied to the `dev` branch first and to `main` on deploy.
- **The deadline:** it's already in the plan, and the setup problems from the earlier build are known.

**Rules for using it:**
- **All database access goes through `lib/`** (for example `lib/orders/`), never straight from pages. That keeps the "every query checks `businessId`" rule in one place, and limits what would change if the ORM did.
- Migrations always run on `dev` first; `main` gets them only at deploy time.

**When to reconsider:** if Prisma's generated code or config gets in the way, or the team wants to work closer to SQL, move to **Drizzle**. The database and its data stay the same; only the code in `lib/` that queries it changes.

### Order workflow: who can change a job's status (decided Oct 29, 2026)

**Decision:** one set of rules in [lib/orders/status.ts](lib/orders/status.ts) decides which status changes are allowed and who may make them. It doesn't touch the database, so every page and API route uses the same rules, and [lib/orders/status.test.ts](lib/orders/status.test.ts) tests them (`pnpm test`, with Vitest).

| Action | From | To | Who |
|---|---|---|---|
| Offer to business | New | Offered | Dispatcher (must choose a business) |
| Withdraw offer | Offered | New | Dispatcher |
| Accept | Offered | Accepted | Owner of that business |
| Decline | Offered | New | Owner of that business (optional reason) |
| Schedule visit | Accepted | Scheduled | Owner (must choose a technician from the business, or themselves, and a time) |
| On my way | Scheduled | On the way | The assigned technician only |
| Start work | On the way | In progress | The assigned technician only |
| Done | In progress | Done | The assigned technician only |
| Mark done | Scheduled, On the way or In progress | Done | Owner, if the technician forgot to update the job |
| Confirm the work is done | Done | Confirmed | Customer, via the tracking link |
| Report a problem | Done | Problem reported | Customer (must say what went wrong) |
| Book a return visit | Problem reported | Scheduled | Owner |
| Cancel job | New, Offered, Accepted, Scheduled or Problem reported | Cancelled | Dispatcher |

**Rules behind the table:**
- **Confirmed and Cancelled are final:** nothing moves out of them.
- **Declining or withdrawing sends the job back to the dispatcher's queue** (New) and clears the business, so it can be offered to another.
- **An owner only acts on their own business's jobs, and a technician only on jobs assigned to them.** This is the `businessId` rule applied to the workflow.
- **Customers can't cancel yet.** The tracking page says to get in touch instead. Hiding the button is clearer than showing a disabled one that doesn't say why. Later, a per-business setting can turn it on.
- **Mark done is the owner's override.** The job history records that the owner made the change, not the technician.
- Changing the visit time or swapping the technician on a scheduled job is an edit, not a status change.
- **The screens ask the rules which buttons to show** (`nextActions`), so they never show a button the server would refuse.

**Saving a change:** [lib/orders/transition.ts](lib/orders/transition.ts) (`applyAction`) checks the rules, then updates the order and writes its OrderEvent (the history entry, with who did it) in one transaction.
- **It only updates if the job is still exactly as it was when checked:** same status, business and technician. If two people tap Accept at once, one succeeds and the other is told "Someone else just changed this job. Reload to see the latest." The same happens if the owner accepts just as the dispatcher withdraws the offer.
- **Every refusal says why,** so an API can reply with the right status code: `status` (not possible at this stage, 409), `person` (not allowed, 403), `input` (a detail is missing or wrong, 400), `not_found` (404) and `conflict` (changed by someone else, 409).
- **Tested against the `dev` database:** the full job from offer to confirm, with the right person recorded at each step; both races above; and the refusals.

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

Deploying on **Friday**, not Sunday, leaves time to fix hosting problems. Sunday after noon is for fixes and rehearsal only.

> **Status, Thu Oct 29 (evening):** Wednesday's data and customer flow is finished, a day late, so Thursday's AI autofill and dispatch work moves to Friday and Saturday. The plan below puts **the core loop first** (request → dispatcher → owner → technician → customer confirms). **AI autofill and suggestion scoring come after it.** If time runs short, they're the first to cut: the demo still works with typed-in details and the dispatcher choosing the business.
>
> **Don't push `main` until Friday's deploy.** Three commits (ratings in Postgres, request form, tracking page) need the `main` database's tables first; pushing earlier breaks the live site.

**Tue Oct 27: Workspace and app shell**
- [x] Workspace: pnpm, Turborepo, TypeScript, Next.js, MUI
- [x] Responsive app shell: theme, breakpoints, navigation (bottom bar on phones, sidebar on laptops)
- [x] Landing page: a line on what to expect (matched within a day, tracking page)
- [x] Rating component: five stars and an optional comment, previewed at `/track/demo` with a "Demo: show rating" switch
- [x] *You:* create accounts and sign in: GitHub, Vercel, Neon (hosted Postgres), Anthropic API key

**Wed Oct 28: Data and customer flow** (finished Thu Oct 29)
- [x] *You:* Neon connected to Vercel; `dev` branch created; `.env.local` with the pooled `DATABASE_URL` (no Docker)
- [x] Prisma connected to Neon: first migration (`init`) on the `dev` branch
- [x] Data model: Business, User (dispatcher, owner, technician), Customer, Order, OrderEvent, Rating ([prisma/schema.prisma](prisma/schema.prisma))
- [x] Order state machine ([lib/orders/status.ts](lib/orders/status.ts)), with tests (`pnpm test`; see [Decisions](#order-workflow-who-can-change-a-jobs-status-decided-oct-29-2026))
- [x] Move ratings from `data/ratings.json` to the database, tied to a confirmed job; demo data with `pnpm db:seed`
- [x] Customer request form that saves real orders ([RequestForm.tsx](app/(public)/request/RequestForm.tsx), `POST /api/orders`; field rules in [lib/orders/request.ts](lib/orders/request.ts), tested)
  - [x] Step indicator at the top: 1 Photo → 2 Check details → 3 Contact info ("Step 2 of 3" on phones)
  - [x] The final button says what happens next: "Send request. We'll find a business for you."
  - [x] Photo step: take or choose a photo and see it; not uploaded yet (AI autofill reads it later; storing photos is a pilot task)
- [x] Customer tracking page ([track/[token]/page.tsx](app/(public)/track/[token]/page.tsx); timeline rules in [lib/orders/tracking.ts](lib/orders/tracking.ts), tested)
  - [x] Status timeline: Request received → Business assigned → Visit scheduled → Technician on the way → Work done → You confirm
  - [x] Each step shows its date, plus the business name and visit time once known; the current step is highlighted
  - [x] Times show in the customer's own time zone; cancelled and problem-reported jobs show a notice; unknown links show 404
- [x] After submitting: show the tracking link with a **Copy link** button and "Save this link to check progress" (no sign-in for customers, and no email until the pilot)
- [ ] *You:* review the phone screens: send a request on your phone and open its tracking page

**Thu Oct 29: Catch-up**
- [x] Flatten the repo to a single Next.js app (see [Decisions](#repo-structure-a-single-nextjs-app-no-monorepo-decided-oct-29-2026))
- [x] Finish Wednesday's data and customer flow (above)
- Moved: AI autofill and the suggested business to Saturday; the dispatcher page to Friday

**Fri Oct 30: Dispatcher and owner, first deploy**
- [x] Save status changes ([lib/orders/transition.ts](lib/orders/transition.ts)): checks the rules, updates the order and writes its OrderEvent in one transaction, and refuses if someone else changed the job first
- [x] Demo account switcher (dispatcher, owner, technician, customer), and demo users in `pnpm db:seed`; each person sees only their own sections
- [x] Dispatcher page: queue of new requests, offer a job to a business (chosen from a list for now), withdraw, cancel
  - [x] One API for every staff button: `POST /api/orders/<id>/actions` ([route.ts](app/api/orders/[id]/actions/route.ts)), with status codes from the workflow rules (401 no account, 403 not allowed, 409 wrong stage or changed by someone else, 400 missing details, 404 no such job)
  - [x] Buttons come from the rules (`nextActions`); Cancel and Withdraw ask first; the offer dialog lists businesses that offer the service first
- [x] Owner page: accept or decline, schedule a visit, assign a technician, **Mark done** if the technician forgets
  - [x] Only the owner's own business's jobs (filtered by `businessId`); customer contact details appear only after accepting
  - [x] Decline asks for an optional reason, saved in the job's history; Book a return visit after a problem
  - [x] Technicians get a basic list of their visits on the same page (the phone-first version is Saturday's)
- [ ] **First production deploy** (Vercel + Neon)
  - [ ] *You:* in Vercel, check **Settings → Build and Deployment → Root Directory** is empty (it was `apps/web`)
  - [ ] Apply migrations and demo data to `main` (`pnpm db:deploy`, then `pnpm db:seed`), without the password going through chat
  - [ ] Push `main`, and check the live site can reach the `main` database. If it fails with a password error, the Neon integration didn't pick up the reset `main` password: in Vercel, open **Storage** → the Neon database and reconnect it to the project, then redeploy
- [ ] *You:* test the live link on your phone

**Sat Oct 31: Technician and customer, then the extras**
- [ ] Technician page (phone): today's jobs; On my way → Start work → Done; optional photo of the finished work
- [ ] Customer confirms the work is done, or reports a problem, on the tracking page
- [x] Rating after the customer confirms
  - [x] Tracking page shows the rating form once confirmed, and the customer's rating after (done Oct 29)
  - [x] Owner sees the stars on the job (Finished section of the owner page, done Oct 30)
- [ ] End-to-end test of the whole job, automated with Playwright in a real browser (`pnpm test:e2e`), on phone and laptop screen sizes
  - [ ] Customer sends a request → dispatcher offers it → owner accepts and schedules a technician → technician taps On my way, Start work, Done → customer confirms and rates
  - [ ] Checks the tracking page shows each step, and each person sees only their own buttons
  - [ ] Runs against the `dev` database and deletes the test job afterwards
- [ ] Dispatcher sees why a job was declined: on its New requests row, "Declined by ABC Fire Safety: Fully booked this week" (the reason is already saved in the job's history), so the dispatcher can choose the next business
- [ ] Suggested business for each request (human in the loop) *(cut first if short of time)*
  - [ ] Scoring rules: offers the service, distance, rating, free time; tested
  - [ ] Show the suggestion with its reasons; **Approve offer** in one tap, or **Choose another**
- [ ] AI autofill from a photo of the notice *(cut first if short of time)*
- [ ] *You:* find 2–3 real notice photos for the demo
- [ ] Demo data: a few jobs at different stages, so every page has something to show
- [ ] Remove the `/track/demo` sample page (the real tracking page replaces it)
- [ ] Spending limit on the API key; password-protect the demo link
- [ ] *You:* full run-through
  - [ ] Every screen is readable on a phone without zooming
  - [ ] Each person knows what to tap next, without being told
  - [ ] The customer understands the tracking page without anyone explaining it
  - [ ] It still works on a phone hotspot

**Sun Nov 1: Polish, freeze and rehearse**
- [ ] Morning: phone and laptop layout polish, and bug fixes from the run-through
- [x] QR code that opens the request page ([docs/qr/](docs/qr/))
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
- [ ] Customers can cancel before the visit, if the business turns it on in its settings
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
