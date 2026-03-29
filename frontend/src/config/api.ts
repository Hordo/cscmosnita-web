// src/config/api.ts

const API_BASE = import.meta.env.VITE_API_URL;

export const API_URLS = {
  token: `${API_BASE}/api/token/`,
  tokenRefresh: `${API_BASE}/api/token/refresh/`,
  register: `${API_BASE}/api/register/`,
  teams: `${API_BASE}/api/teams/`,
  coaches: `${API_BASE}/api/coaches/`,
  players: `${API_BASE}/api/players/`,
  championships: `${API_BASE}/api/championships/`,
  matches: `${API_BASE}/api/matches/`,
  uploadPlayerPhoto: `${API_BASE}/api/upload/player-photo/`,
  uploadTeamPhoto: `${API_BASE}/api/upload/team-photo/`,
  uploadCoachPhoto: `${API_BASE}/api/upload/coach-photo/`,
  uploadGeneralPhoto: `${API_BASE}/api/upload/general-photo/`,
  // Add more endpoints as needed
};
