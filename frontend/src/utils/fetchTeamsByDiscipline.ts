import api from "../config/axios";

export async function fetchTeamsByDiscipline(discipline: string) {
  const res = await api.get(`/api/teams/?discipline=${discipline}`);
  return res.data;
}
