import { RouterProvider } from "react-router-dom";
import router from "./layout/PageRoutes";

export default function App() {
  return <RouterProvider router={router} />;
}
