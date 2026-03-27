export type MenuItem = {
  label: string;
  path?: string;
  mega?: boolean;
  auth?: boolean;
  children?: MenuItem[];
};

export const menuConfig: MenuItem[] = [
  {
    label: "Coaches",
    path: "/coaches",
  },
  {
    label: "Teams",
    mega: true,
    children: [
      { label: "Team 1", path: "/teams/team1" },
      { label: "Team 2", path: "/teams/team2" },
      { label: "Team 3", path: "/teams/team3" },
    ],
  },
  {
    label: "Profile",
    mega: true,
    children: [
      { label: "Login", path: "/login", auth: false },
      { label: "Register", path: "/register", auth: false },
      { label: "Logout", path: "/logout", auth: true },
    ],
  },
];
