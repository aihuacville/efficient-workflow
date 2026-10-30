import Typography from "@mui/material/Typography";

/** A titled part of a staff page, with a one-line hint about what's in it. */
export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <Typography variant="h2" component="h2">
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 1.5 }}>
        {hint}
      </Typography>
      {children}
    </section>
  );
}
