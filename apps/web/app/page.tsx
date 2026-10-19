import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

const steps = [
  ["Snap", "Take a photo of the notice you received."],
  ["Confirm", "We fill in the request for you. Check it and confirm."],
  ["Get it serviced", "A nearby qualified business takes the job. Track it until it's done."],
] as const;

export default function Home() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h1" gutterBottom>
            Got a notice? We&apos;ll handle the paperwork.
          </Typography>
          <Typography color="text.secondary">
            Snap a photo of an inspection or compliance notice and we&apos;ll book a qualified local
            business to take care of it.
          </Typography>
        </Box>
        <Button component={Link} href="/request" variant="contained" size="large">
          Start a request
        </Button>
        <Stack component="ol" spacing={2} sx={{ pl: 2.5, m: 0 }}>
          {steps.map(([title, body]) => (
            <li key={title}>
              <Typography fontWeight={600}>{title}</Typography>
              <Typography color="text.secondary">{body}</Typography>
            </li>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
