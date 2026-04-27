import { Outlet } from "react-router-dom";
import TopNavbar from "./TopNavbar";
import Footer from "../components/Footer";
import ServerWakeupBanner from "../components/ServerWakeupBanner";

export default function Layout() {
  return (
    <div>
      <header style={{ position: "sticky", top: 0, zIndex: 1040 }}>
        <TopNavbar />
      </header>

      <main>
        <Outlet />
        <Footer />
      </main>

      <ServerWakeupBanner />
    </div>
  );
}
