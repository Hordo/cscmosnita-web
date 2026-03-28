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
    label: "Coaches",
    path: "/coaches",
  },
  {
    label: "Teams",
    mega: true,
    children: [
      [],
      [],
      [
        { label: "Team 1", path: "/teams/team1" },
        { label: "Team 2", path: "/teams/team2" },
        { label: "Team 3", path: "/teams/team3" },
      ],
    ],
  },
  {
    label: "Admin",
    mega: true,
    auth: true,
    // Custom property to indicate admin-only
    adminOnly: true as any, // TypeScript workaround, will filter in navbar
    children: [
      [{ label: "Create Team", path: "/admin/create-team" }],
      [
        { label: "Create Player", path: "/admin/player" },
        { label: "Assign Players to Teams", path: "/admin/assign-players" },
      ],
      [
        { label: "Create Coach", path: "/admin/create-coach" },
        { label: "Assign Coaches to Teams", path: "/admin/assign-coaches" },
      ],
    ],
  },
  {
    label: "Login",
    path: "/login",
    auth: false,
  },
  {
    label: "Logout",
    path: "/logout",
    auth: true,
  },
];
