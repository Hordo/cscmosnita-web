export type MenuItem = {
  label: string;
  path?: string;
  mega?: boolean;
  auth?: boolean;
  adminOnly?: boolean;
  // For normal dropdowns: children is MenuItem[]
  // For mega menus: children is Column[]
  children?: MenuItem[] | Column[];
};

// For mega menu columns
export type Column = MenuItem[];

export const menuConfig: MenuItem[] = [
  {
    label: "menu.contact",
    path: "/contact",
  },
  {
    label: "menu.disciplines",
    mega: true,
    children: [
      [],
      [],
      [
        { label: "menu.football", path: "/disciplines/fotbal" },
        { label: "menu.basketball", path: "/disciplines/baschet" },
        { label: "menu.handball", path: "/disciplines/handbal" },
      ],
    ],
  },
  {
    label: "menu.admin",
    mega: true,
    auth: true,
    adminOnly: true as any, // TypeScript workaround, will filter in navbar
    children: [
      [],
      [{ label: "menu.calendar", path: "/admin/calendar" }],
      [
        { label: "menu.manage_teams", path: "/admin/create-team" },
        { label: "menu.manage_coaches", path: "/admin/create-coach" },
        { label: "menu.manage_players", path: "/admin/player" },
        { label: "menu.manage_disciplines", path: "/admin/disciplines" },
        { label: "menu.manage_matches", path: "/admin/matches" },
      ],
    ],
  },
  {
    label: "login",
    path: "/login",
    auth: false,
  },
  {
    label: "logout",
    path: "/logout",
    auth: true,
  },
];
