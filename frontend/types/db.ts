export interface Player {
  id: number;
  first_name: string;
  last_name: string;
  number: number | null;
  position: string;
  photo: string | null;
  team: number; // team id
}

export interface Team {
  id: number;
  name: string;
  age_group: string;
  season: string;
  photo: string | null;
  discipline: number | null; // discipline id
}

export interface Coach {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  photo: string | null;
  teams: number[]; // array of team ids
}

// CoachTeam is not needed, as Coach.teams and Team.coaches are M2M

export interface Match {
  id: number;
  championship: number; // championship id
  team: number; // team id
  date: string;
  home: boolean;
  opponent_name: string;
  our_score: number | null;
  opponent_score: number | null;
  youtube_link: string;
}

export interface Championship {
  id: number;
  name: string;
  season: string;
  team: number; // team id
}

export interface Discipline {
  id: number;
  name: string;
}
