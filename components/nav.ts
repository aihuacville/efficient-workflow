import AssignmentIcon from "@mui/icons-material/AssignmentOutlined";
import HandymanIcon from "@mui/icons-material/HandymanOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import type { Role } from "@/lib/generated/prisma/enums";

export interface NavItem {
  href: string;
  label: string;
  icon: SvgIconComponent;
  /** Who sees this section. */
  roles: Role[];
}

/** App sections, shown in the laptop sidebar and the phone bottom bar. Keep to 2–5 items. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dispatch", label: "Dispatch", icon: AssignmentIcon, roles: ["DISPATCHER"] },
  { href: "/jobs", label: "My jobs", icon: HandymanIcon, roles: ["OWNER", "TECHNICIAN"] },
];
