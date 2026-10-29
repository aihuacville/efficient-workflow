import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

/** Page title, an optional subtitle, and actions that wrap below the title on phones. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems={{ sm: "flex-end" }}
      justifyContent="space-between"
      sx={{ mb: 3 }}
    >
      <div>
        <Typography variant="h1">{title}</Typography>
        {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
      </div>
      {actions && (
        <Stack direction="row" spacing={1}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
