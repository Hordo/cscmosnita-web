import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div>
      <header>
        <h2>CSC Moșnița</h2>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
