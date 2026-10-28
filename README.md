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

**Decision:** use MUI with its built-in styling (Emotion) for the demo MVP. Style only through the theme ([theme.ts](apps/web/theme/theme.ts)) and `sx` props, with no separate stylesheets. Look at this again after the demo.

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
- [ ] PWA: installable app, offline job list for technicians, push notifications
- [ ] Passkey sign-in
- [ ] Google Sheets sync for owners
- [ ] Admin reports and AI assistant
- [ ] More service types and cities
