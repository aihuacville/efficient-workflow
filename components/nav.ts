import AssignmentIcon from "@mui/icons-material/AssignmentOutlined";
import HandymanIcon from "@mui/icons-material/HandymanOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

export interface NavItem {
  href: string;
  label: string;
  icon: SvgIconComponent;
}

/** App sections, shown in the laptop sidebar and the phone bottom bar. Keep to 2–5 items. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dispatch", label: "Dispatch", icon: AssignmentIcon },
  { href: "/jobs", label: "My jobs", icon: HandymanIcon },
];
