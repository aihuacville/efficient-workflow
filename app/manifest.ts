import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Efficient Workflow",
    short_name: "Workflow",
    description: "Snap a notice. Confirm the form. Get it serviced.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#1f5fbf",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
