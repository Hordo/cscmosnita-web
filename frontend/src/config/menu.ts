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
    label: "Disciplines",
    mega: true,
    children: [
      [],
      [],
      [
        { label: "Fotbal", path: "/disciplines/fotbal" },
        { label: "Baschet", path: "/disciplines/baschet" },
        { label: "Handbal", path: "/disciplines/handbal" },
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
      [],
      [],
      [
        { label: "Create Team", path: "/admin/create-team" },
        { label: "Create Coach", path: "/admin/create-coach" },
        { label: "Create Player", path: "/admin/player" },
        { label: "Create Discipline", path: "/admin/disciplines" },
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
