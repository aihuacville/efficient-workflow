import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { MyRequests } from "@/components/MyRequests";

const STEPS = [
  ["Snap", "Take a photo of the notice you received."],
  ["Confirm", "We fill in the request for you. Check it and confirm."],
  [
    "Get it done",
    "A qualified local business does the work. Follow each step and confirm when it's finished.",
  ],
] as const;

export default function Home() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
      <Stack spacing={4}>
        <div>
          <Typography variant="h1" gutterBottom>
            Got a notice? We&apos;ll handle the paperwork.
          </Typography>
          <Typography color="text.secondary">
            Snap a photo of an inspection or compliance notice and we&apos;ll book a qualified local
            business to take care of it.
          </Typography>
        </div>
        <Button component={Link} href="/request" variant="contained" size="large">
          Start a request
        </Button>
        <MyRequests />
        <Stack component="ol" spacing={2} sx={{ pl: 2.5, m: 0 }}>
          {STEPS.map(([title, body]) => (
            <li key={title}>
              <Typography fontWeight={600}>{title}</Typography>
              <Typography color="text.secondary">{body}</Typography>
            </li>
          ))}
        </Stack>
        <Typography color="text.secondary">
          We aim to match you with a business within a day, and you can follow every step on your
          tracking page.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Run a service business? <Link href="/jobs">Open your jobs</Link>
        </Typography>
      </Stack>
    </Container>
  );
}
