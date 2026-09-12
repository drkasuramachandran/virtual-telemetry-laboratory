import {
  Home,
  HeartPulse,
  Fingerprint,
  Droplet,
  RadioTower,
  Network,
  BatteryCharging,
  SlidersHorizontal,
  PackageSearch,
  FolderKanban,
  Trophy,
  GraduationCap,
  ClipboardCheck,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  enabled: boolean;
  medical?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Home", to: "/", icon: Home, enabled: true }],
  },
  {
    title: "Medical Device Labs",
    items: [
      { label: "ECG", to: "/lab/ecg", icon: HeartPulse, enabled: true, medical: true },
      { label: "Pulse Oximeter", to: "/lab/pulse-ox", icon: Fingerprint, enabled: true, medical: true },
      { label: "CGM", to: "/lab/cgm", icon: Droplet, enabled: true, medical: true },
    ],
  },
  {
    title: "Engineering Tools",
    items: [
      { label: "Wireless Tech Comparison", to: "/tools/wireless-comparison", icon: RadioTower, enabled: true },
      { label: "Network Simulator", to: "/tools/network-simulator", icon: Network, enabled: true },
      { label: "Power Simulator", to: "/tools/power-simulator", icon: BatteryCharging, enabled: true },
      { label: "Signal Conditioning Lab", to: "/tools/signal-conditioning", icon: SlidersHorizontal, enabled: true },
      { label: "Packet Inspector", to: "/tools/packet-inspector", icon: PackageSearch, enabled: false },
    ],
  },
  {
    title: "Course",
    items: [
      { label: "Student Project Mode", to: "/projects", icon: FolderKanban, enabled: true },
      { label: "Design Challenges", to: "/challenges", icon: Trophy, enabled: true },
      { label: "Instructor Mode", to: "/instructor", icon: GraduationCap, enabled: true },
      { label: "Assessment", to: "/assessment", icon: ClipboardCheck, enabled: true },
    ],
  },
];
