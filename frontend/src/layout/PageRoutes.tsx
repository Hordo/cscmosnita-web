import { createBrowserRouter } from "react-router-dom";
import Layout from "./Layout";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Logout from "../pages/Logout";
import PlayerAdminPage from "../admin/PlayerAdminPage";
import TeamAdminPage from "../admin/TeamAdminPage";
import AdminOnlyRoute from "../admin/AdminOnlyRoute";
import CoachAdminPage from "../admin/CoachAdminPage";
import ChampionshipAdminPage from "../admin/ChampionshipAdminPage";
import NotFound from "../pages/NotFound";
import { TeamViewerPage } from "../pages/TeamViewerPage";
import { TeamMatchesPage } from "../pages/TeamMatchesPage";
import { DisciplineDetailPage } from "../pages/DisciplineDetailPage";
import DisciplineAdminPage from "../admin/DisciplineAdminPage";
import Terms from "../pages/Terms";
import CookiesPolicy from "../pages/CookiesPolicy";
import About from "../pages/About";
import Contact from "../pages/Contact";
import GDPR from "../pages/GDPR";
import Calendar from "../admin/Calendar";
import NotificationPreferencesPage from "../pages/NotificationPreferencesPage";
import RouteError from "./RouteError";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "logout", element: <Logout /> },
      {
        path: "admin",
        element: <AdminOnlyRoute />,
        children: [
          {
            path: "create-team",
            element: <TeamAdminPage />,
          },
          {
            path: "player",
            element: <PlayerAdminPage />,
          },
          {
            path: "assign-players",
            element: <div>Assign Players to Teams (TODO)</div>,
          },
          {
            path: "create-coach",
            element: <CoachAdminPage />,
          },
          {
            path: "assign-coaches",
            element: <div>Assign Coaches to Teams (TODO)</div>,
          },
          {
            path: "disciplines",
            element: <DisciplineAdminPage />,
          },
          {
            path: "calendar",
            element: <Calendar />,
          },
          {
            path: "championship",
            element: <ChampionshipAdminPage />,
          },
        ],
      },
      { path: "teams", element: <TeamViewerPage /> },
      { path: "teams/:teamId", element: <TeamViewerPage /> },
      { path: "teams/:teamId/matches", element: <TeamMatchesPage /> },
      { path: "disciplines/:discipline", element: <DisciplineDetailPage /> },
      { path: "terms", element: <Terms /> },
      { path: "cookies-policy", element: <CookiesPolicy /> },
      { path: "about", element: <About /> },
      { path: "contact", element: <Contact /> },
      { path: "gdpr", element: <GDPR /> },
      { path: "notifications", element: <NotificationPreferencesPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;
