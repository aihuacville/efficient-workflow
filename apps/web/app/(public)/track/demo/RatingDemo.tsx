"use client";

import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import { useState } from "react";
import { RatingForm } from "@/components/RatingForm";

/** Demo-only switch to show the rating before the real "You confirmed" step exists. */
export function RatingDemo() {
  const [show, setShow] = useState(false);

  return (
    <Stack spacing={2}>
      <FormControlLabel
        control={<Switch checked={show} onChange={(e) => setShow(e.target.checked)} />}
        label="Demo: show rating"
      />
      {show && <RatingForm businessName="ABC Fire Safety" />}
    </Stack>
  );
}
