export type MenuItem = {
  label: string;
  path?: string;
  mega?: boolean;
  auth?: boolean;
  adminOnly?: boolean;
  superAdminOnly?: boolean; // only superusers see this
  headAdminOnly?: boolean; // only head_admin or superuser see this
  accountantAccessible?: boolean; // visible to pure accountant admins (accountant-only, no other admin role)
  // For normal dropdowns: children is MenuItem[]
  // For mega menus: children is Column[]
  children?: MenuItem[] | Column[];
};

// For mega menu columns
export type Column = MenuItem[];

export const menuConfig: MenuItem[] = [
  {
    label: "menu.news",
    path: "/news",
  },
  {
    label: "menu.transparenta",
    path: "/transparenta",
  },
  {
    label: "menu.contact",
    path: "/contact",
  },
  {
    label: "menu.orgchart",
    path: "/organigrama",
  },
  {
    label: "menu.disciplines",
    mega: true,
    children: [
      [
        { label: "menu.atletism", path: "/disciplines/atletism" },
        { label: "menu.sah", path: "/disciplines/șah" },
      ],
      [
        { label: "menu.karate", path: "/disciplines/karate" },
        { label: "menu.kempo", path: "/disciplines/kempo" },
      ],
      [
        { label: "menu.fotbal", path: "/disciplines/fotbal" },
        { label: "menu.baschet", path: "/disciplines/baschet" },
        { label: "menu.handbal", path: "/disciplines/handbal" },
      ],
    ],
  },
  {
    label: "menu.admin",
    mega: true,
    auth: true,
    adminOnly: true as any, // TypeScript workaround, will filter in navbar
    children: [
      [
        {
          label: "menu.manage_news",
          path: "/admin/news",
          accountantAccessible: true,
        },
        {
          label: "menu.manage_users",
          path: "/admin/users",
          superAdminOnly: true,
        },
        {
          label: "menu.manage_official_docs",
          path: "/admin/official-documents",
          accountantAccessible: true,
        },
        {
          label: "menu.manage_resources",
          path: "/admin/resources",
          accountantAccessible: true,
        },
      ],
      [
        { label: "menu.calendar", path: "/admin/calendar" },
        {
          label: "menu.manage_championships",
          path: "/admin/championship",
        },
        { label: "menu.manage_tournaments", path: "/admin/tournaments" },
      ],
      [
        {
          label: "menu.manage_teams",
          path: "/admin/create-team",
          headAdminOnly: true,
        },
        {
          label: "menu.manage_coaches",
          path: "/admin/create-coach",
          headAdminOnly: true,
        },
        { label: "menu.manage_players", path: "/admin/player" },
        { label: "menu.manage_gallery", path: "/admin/gallery" },
        {
          label: "menu.manage_disciplines",
          path: "/admin/disciplines",
          superAdminOnly: true,
        },
        {
          label: "menu.manage_sponsors",
          path: "/admin/sponsors",
          superAdminOnly: true,
        },
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
