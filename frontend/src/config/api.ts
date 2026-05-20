// src/config/api.ts

const API_BASE = import.meta.env.VITE_API_URL;

export const API_URLS = {
  token: `${API_BASE}/api/token/`,
  tokenRefresh: `${API_BASE}/api/token/refresh/`,
  register: `${API_BASE}/api/register/`,
  verifyEmail: `${API_BASE}/api/verify-email/`,
  teams: `${API_BASE}/api/teams/`,
  coaches: `${API_BASE}/api/coaches/`,
  players: `${API_BASE}/api/players/`,
  championships: `${API_BASE}/api/championships/`,
  matches: `${API_BASE}/api/matches/`,
  disciplines: `${API_BASE}/api/disciplines/`,
  uploadPlayerPhoto: `${API_BASE}/api/upload/player-photo/`,
  uploadTeamPhoto: `${API_BASE}/api/upload/team-photo/`,
  uploadCoachPhoto: `${API_BASE}/api/upload/coach-photo/`,
  uploadGeneralPhoto: `${API_BASE}/api/upload/general-photo/`,
  uploadSponsorLogo: `${API_BASE}/api/upload/sponsor-logo/`,
  // Calendar endpoints
  calendarEvents: `${API_BASE}/api/calendar/events/`,
  calendarEventTypes: `${API_BASE}/api/calendar/event-types/`,
  calendarTrainings: `${API_BASE}/api/calendar/trainings/`,
  // Tournament endpoints
  tournaments: `${API_BASE}/api/tournaments/`,
  tournamentGroups: `${API_BASE}/api/tournament-groups/`,
  groupTeams: `${API_BASE}/api/group-teams/`,
  tournamentMatches: `${API_BASE}/api/tournament-matches/`,
  sponsors: `${API_BASE}/api/sponsors/`,
  news: `${API_BASE}/api/news/`,
  uploadNewsCover: `${API_BASE}/api/upload/news-cover/`,
  // Admin user management (super admin only)
  adminUsers: `${API_BASE}/api/admin/users/`,
  adminUserRoles: `${API_BASE}/api/admin/user-roles/`,
  adminUserSetSuperuser: (userId: number) =>
    `${API_BASE}/api/admin/users/${userId}/set-superuser/`,
  teamPhotos: `${API_BASE}/api/team-photos/`,
  uploadTeamGalleryPhoto: `${API_BASE}/api/upload/team-gallery-photo/`,
  officialDocuments: `${API_BASE}/api/official-documents/`,
  uploadOfficialDocument: `${API_BASE}/api/upload/official-document/`,
  resourceLocations: `${API_BASE}/api/resource-locations/`,
  resourceBookings: `${API_BASE}/api/resource-bookings/`,
  individualCompetitions: `${API_BASE}/api/individual-competitions/`,
  individualResults: `${API_BASE}/api/individual-results/`,
  individualRaces: `${API_BASE}/api/individual-races/`,
  individualRaceParticipants: `${API_BASE}/api/individual-race-participants/`,
};
