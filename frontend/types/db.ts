export interface Player {
  id: number;
  first_name: string;
  last_name: string;
  number: number;
  position: string;
  team_id: number | null;
  photo: string | null;
}

export interface Team {
  id: number;
  name: string;
  logo: string | null;
  discipline_id: number | null;
}

export interface Coach {
  id: number;
  first_name: string;
  last_name: string;
  photo: string | null;
}

export interface CoachTeam {
  id: number;
  coach_id: number;
  team_id: number;
}

export interface Match {
  id: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  date: string;
}

export interface Championship {
  id: number;
  name: string;
  season: string;
}

export interface Discipline {
  id: number;
  name: string;
}
