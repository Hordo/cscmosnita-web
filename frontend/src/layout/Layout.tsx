import { Outlet } from "react-router-dom";
import TopNavbar from "./TopNavbar";

export default function Layout() {
  return (
    <div>
      <header>
        <TopNavbar />
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
