//create the logout page, which will call the logout API and then redirect to home page
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    logout(); // clear tokens from context
    navigate("/"); // redirect to home
  }, [logout, navigate]);

  return null; // no UI needed
}
