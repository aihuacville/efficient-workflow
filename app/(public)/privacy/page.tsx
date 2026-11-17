import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

// Kept in step with the code: if what's stored or who sees it changes (lib/orders/queries.ts,
// lib/my-requests.ts, lib/session.ts, prisma/schema.prisma), update this page too.

const UPDATED = "November 17, 2026";

/** Where people ask for a copy or deletion of their details. Set it before real customers use the app. */
const CONTACT_EMAIL = process.env.PRIVACY_CONTACT_EMAIL;

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "What we collect",
    body: (
      <>
        <Typography>When you send a request, we store:</Typography>
        <ul>
          <li>The service you need, the address, the deadline on your notice, and any notes.</li>
          <li>Your name and phone number, and your email if you give it.</li>
          <li>Each step of the job (for example, when it was scheduled and finished).</li>
          <li>Your rating and comment, if you leave one.</li>
        </ul>
        <Typography>
          Photos of your notice stay on your phone. We don&apos;t upload or store them.
        </Typography>
      </>
    ),
  },
  {
    title: "Who sees it",
    body: (
      <ul>
        <li>
          <strong>The business that takes your job</strong> sees your name, phone number, address
          and notes, so it can do the work. A business offered your job sees only the service,
          address and notes until it accepts.
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
        <li>We don&apos;t sell your details or use them for advertising.</li>
        <li>We don&apos;t send marketing messages.</li>
        <li>We don&apos;t use tracking or advertising cookies.</li>
      </ul>
    ),
  },
  {
    title: "On your device",
    body: (
      <Typography>
        This browser remembers the requests you&apos;ve sent or opened (the service and date, not
        the address), so you can find them again from the home page. It stays on this device and is
        never sent to us. Clearing your browser&apos;s site data removes it.
      </Typography>
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
