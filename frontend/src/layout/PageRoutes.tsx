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
import NotFound from "../pages/NotFound";
import { TeamViewerPage } from "../pages/TeamViewerPage";
import { DisciplineDetailPage } from "../pages/DisciplineDetailPage";
import DisciplineAdminPage from "../admin/DisciplineAdminPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
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
        ],
      },
      { path: "teams", element: <TeamViewerPage /> },
      { path: "disciplines/:discipline", element: <DisciplineDetailPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;
