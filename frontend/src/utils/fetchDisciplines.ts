// Fetch all disciplines for select options
import api from "../config/axios";

export async function fetchDisciplines() {
  const res = await api.get("/api/disciplines/");
  return res.data;
}
