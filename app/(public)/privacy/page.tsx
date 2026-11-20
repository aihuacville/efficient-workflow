import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { GA_ID } from "@/lib/analytics";

export const metadata: Metadata = { title: "Privacy" };

// Kept in step with the code: if what's stored or who sees it changes (lib/orders/queries.ts,
// lib/my-requests.ts, lib/my-contact.ts, lib/session.ts, lib/analytics.ts, lib/autofill/,
// prisma/schema.prisma), update this page too.

const UPDATED = "November 19, 2026";

/** Where people ask for a copy or deletion of their details. Set it before real customers use the app. */
const CONTACT_EMAIL = process.env.PRIVACY_CONTACT_EMAIL;

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "What we collect",
    body: (
      <>
        <Typography>When you send a request, we store:</Typography>
        <ul>
          <li>
            The service you need, the address, the due date on your notice, any notes, and for
            backflow testing, the TRAC number on your notice if you give it.
          </li>
          <li>Your name and phone number, and your email if you give it.</li>
          <li>Each step of the job (for example, when it was scheduled and finished).</li>
          <li>Your rating and comment, if you leave one.</li>
        </ul>
        <Typography>
          If you add a photo of your notice, we send it to Anthropic, the company whose AI (Claude)
          reads the details from it, so we can fill in the form for you to check. We don&apos;t
          store the photo, and only the details you send with your request are saved.
        </Typography>
      </>
    ),
  },
  {
    title: "Who sees it",
    body: (
      <ul>
        <li>
          <strong>The business that takes your job</strong> sees your name, phone number, address,
          notes and TRAC number, so it can do the work. A business offered your job sees only the
          service, address and notes until it accepts.
        </li>
        <li>
          <strong>Our dispatchers</strong> see the service, address and notes, to find a business
          for you. They don&apos;t see your name or contact details on their page.
        </li>
        <li>
          <strong>Anyone with your tracking link</strong> can see the request&apos;s progress and
          address. Share it only with people you trust.
        </li>
      </ul>
    ),
  },
  {
    title: "What we don't do",
    body: (
      <ul>
        <li>
          We don&apos;t sell or share your personal information, as California law defines those
          terms, and we don&apos;t use it for advertising.
        </li>
        <li>We don&apos;t send marketing messages.</li>
        <li>We don&apos;t use advertising cookies.</li>
      </ul>
    ),
  },
  {
    title: "Cookies and storage on your device",
    body: (
      <ul>
        <li>
          <strong>Your requests.</strong> This browser remembers the requests you&apos;ve sent or
          opened (the service and date, not the address), so you can find them again from the home
          page. It stays on this device and is never sent to us. Clearing your browser&apos;s site
          data removes it.
        </li>
        <li>
          <strong>Your name and phone.</strong> If you leave &ldquo;Remember my name and phone on
          this phone&rdquo; ticked when you send a request, this browser remembers them to fill in
          your next request. Not your email or address. It stays on this device and is never sent to
          us. Untick the box, tap &ldquo;Not you? Clear&rdquo; on the form, or clear your
          browser&apos;s site data to remove it.
        </li>
        {GA_ID ? (
          <li>
            <strong>Analytics.</strong> We use Google Analytics to count visits and see which pages
            people use, so we can improve the service. It sets cookies whose names start with{" "}
            <code>_ga</code>, which last up to two years. We never send it your name, contact
            details, address or tracking link, and its advertising features are off. To opt out,
            turn on Global Privacy Control in your browser (we then don&apos;t load Google Analytics
            at all), or use{" "}
            <Link href="https://tools.google.com/dlpage/gaoptout">
              Google&apos;s opt-out add-on
            </Link>
            .
          </li>
        ) : (
          <li>
            <strong>No cookies for customers.</strong> We don&apos;t use analytics or other cookies
            on customer pages.
          </li>
        )}
        <li>
          <strong>Staff who sign in</strong> get one cookie that keeps them signed in for a week.
          Signing out removes it.
        </li>
      </ul>
    ),
  },
  {
    title: "Where it's stored",
    body: (
      <Typography>
        The app is hosted by Vercel, and your details are stored in a database run by Neon. They
        handle it only to run the service for us.
      </Typography>
    ),
  },
  {
    title: "Your choices",
    body: (
      <Typography>
        You can ask for a copy of your details, or for them to be deleted, at any time
        {CONTACT_EMAIL ? (
          <>
            : email <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link> and include your
            tracking link so we can find your request.
          </>
        ) : (
          <>. Include your tracking link so we can find your request.</>
        )}{" "}
        We&apos;ll also delete details once they&apos;re no longer needed for the job; we&apos;ll
        say how long that is here before the service opens to the public.
      </Typography>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, md: 6 } }}>
      <Typography variant="h1" gutterBottom>
        Privacy
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        What happens to the details you give us. Last updated {UPDATED}.
      </Typography>
      <Stack spacing={4} sx={{ "& ul": { pl: 2.5, my: 1 }, "& li": { mb: 1 } }}>
        {SECTIONS.map(({ title, body }) => (
          <section key={title}>
            <Typography variant="h2" component="h2" gutterBottom>
              {title}
            </Typography>
            {body}
          </section>
        ))}
      </Stack>
    </Container>
  );
}
