import Alert from "@mui/material/Alert";

/** Shown on a staff page when the signed-in person (or nobody) isn't who the page is for. */
export function SwitchAccountPrompt({ who }: { who: string }) {
  return (
    <Alert severity="info">This page is for {who}. Use the account switcher to become one.</Alert>
  );
}
