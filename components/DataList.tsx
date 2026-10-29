import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

export interface Column<T> {
  label: string;
  render: (row: T) => React.ReactNode;
  /** Shown as the card's title on phones. Exactly one column should set this. */
  primary?: boolean;
}

/**
 * The same rows as a table on laptops (md and up) and as stacked cards on phones.
 * Both are rendered and CSS picks one, so there's no layout flash on first load.
 */
export function DataList<T>({
  rows,
  columns,
  getKey,
  actions,
  empty,
}: {
  rows: T[];
  columns: Column<T>[];
  getKey: (row: T) => string;
  actions?: (row: T) => React.ReactNode;
  empty: React.ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">{empty}</Typography>
      </Paper>
    );
  }
  const primary = columns.find((c) => c.primary) ?? columns[0]!;
  const details = columns.filter((c) => c !== primary);

  return (
    <>
      <TableContainer component={Paper} sx={{ display: { xs: "none", md: "block" } }}>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.label}>{c.label}</TableCell>
              ))}
              {actions && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={getKey(row)} hover>
                {columns.map((c) => (
                  <TableCell key={c.label}>{c.render(row)}</TableCell>
                ))}
                {actions && (
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {actions(row)}
                    </Stack>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack spacing={1.5} sx={{ display: { md: "none" } }}>
        {rows.map((row) => (
          <Paper key={getKey(row)} sx={{ p: 2 }}>
            <Typography fontWeight={600} sx={{ mb: 1 }}>
              {primary.render(row)}
            </Typography>
            <Box component="dl" sx={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 2, rowGap: 0.5, m: 0 }}>
              {details.map((c) => (
                <Box key={c.label} sx={{ display: "contents" }}>
                  <Typography component="dt" variant="body2" color="text.secondary">
                    {c.label}
                  </Typography>
                  <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                    {c.render(row)}
                  </Typography>
                </Box>
              ))}
            </Box>
            {actions && (
              <Stack direction="row" spacing={1} sx={{ mt: 2, "& > *": { flex: 1 } }}>
                {actions(row)}
              </Stack>
            )}
          </Paper>
        ))}
      </Stack>
    </>
  );
}
