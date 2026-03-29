import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  User,
  FileSearch,
  FileText,
  Target,
  Activity,
  MessageSquare,
  Mail,
  Scale,
  CheckSquare,
  Gavel,
  BookOpen,
  Settings,
  Users,
} from "lucide-react";
import type { Role } from "@/domain/auth/roles";
import { ROLES } from "@/domain/auth/roles";

export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  rolesAllowed: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    rolesAllowed: [ROLES.PARENT, ROLES.ADVOCATE, ROLES.TEACHER_THERAPIST, ROLES.ADMIN],
  },
  {
    key: "child-profile",
    label: "Child Profile",
    path: "/child-profile",
    icon: User,
    rolesAllowed: [ROLES.PARENT, ROLES.ADVOCATE, ROLES.ADMIN],
  },
  {
    key: "iep-analyzer",
    label: "IEP Analyzer",
    path: "/iep/analyse",
    icon: FileSearch,
    rolesAllowed: [ROLES.PARENT, ROLES.ADMIN],
  },
  {
    key: "iep-list",
    label: "IEP Documents",
    path: "/iep/list",
    icon: FileText,
    rolesAllowed: [ROLES.PARENT, ROLES.ADMIN],
  },
  {
    key: "goal-progress",
    label: "Goal Progress",
    path: "/goal-progress",
    icon: Target,
    rolesAllowed: [ROLES.PARENT, ROLES.ADVOCATE, ROLES.TEACHER_THERAPIST, ROLES.ADMIN],
  },
  // {
  //   key: "behavior-abc",
  //   label: "Behavior (ABC)",
  //   path: "/behavior-abc",
  //   icon: Activity,
  //   rolesAllowed: [ROLES.PARENT, ROLES.TEACHER_THERAPIST, ROLES.ADMIN],
  // },
  {
    key: "contact-log",
    label: "Contact Log",
    path: "/contact-log",
    icon: MessageSquare,
    rolesAllowed: [ROLES.PARENT, ROLES.ADVOCATE, ROLES.TEACHER_THERAPIST, ROLES.ADMIN],
  },
  {
    key: "letter-writer",
    label: "Letter Writer",
    path: "/letter-writer",
    icon: Mail,
    rolesAllowed: [ROLES.PARENT, ROLES.ADMIN],
  },
  {
    key: "advocacy-lab",
    label: "Advocacy Lab",
    path: "/advocacy-lab",
    icon: Scale,
    rolesAllowed: [ROLES.PARENT, ROLES.ADVOCATE, ROLES.ADMIN],
  },
  {
    key: "compliance",
    label: "Compliance",
    path: "/compliance",
    icon: CheckSquare,
    rolesAllowed: [ROLES.PARENT, ROLES.ADVOCATE, ROLES.ADMIN],
  },
  {
    key: "legal-support",
    label: "Legal Support",
    path: "/legal-support",
    icon: Gavel,
    rolesAllowed: [ROLES.PARENT, ROLES.ADVOCATE, ROLES.ADMIN],
  },
  {
    key: "resources",
    label: "Resources",
    path: "/resources",
    icon: BookOpen,
    rolesAllowed: [ROLES.PARENT, ROLES.ADVOCATE, ROLES.TEACHER_THERAPIST, ROLES.ADMIN],
  },
  {
    key: "admin-users",
    label: "User Management",
    path: "/admin/users",
    icon: Users,
    rolesAllowed: [ROLES.ADMIN],
  },
  {
    key: "settings",
    label: "Settings",
    path: "/settings",
    icon: Settings,
    rolesAllowed: [ROLES.PARENT, ROLES.ADVOCATE, ROLES.TEACHER_THERAPIST, ROLES.ADMIN],
  },
];
