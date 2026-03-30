import { Outlet } from "react-router-dom";
import TopNavbar from "./TopNavbar";
import Footer from "../components/Footer";

export default function Layout() {
  return (
    <div>
      <header>
        <TopNavbar />
      </header>

      <main>
        <Outlet />
        <Footer />
      </main>
    </div>
  );
}
