export interface Player {
  id: number;
  first_name: string;
  last_name: string;
  number: number | null;
  position: string;
  photo_url: string | null;
  team_id: number | null;
}

export interface Team {
  id: number;
  name: string;
  name_en: string;
  year: number | null;
  photo_url: string | null;
  discipline_id: number | null;
  discipline: string | null; // discipline name string
}

export interface Coach {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  photo_url: string | null;
  teams: number[]; // array of team ids
}

export interface Match {
  id: number;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  youtube_link: string | null;
  date: string | null;
  team_id: number | null;
}

export interface Discipline {
  id: number;
  name: string;
  name_en: string;
  description: string | null;
  description_en: string | null;
  head_coach: {
    id: number;
    first_name: string;
    last_name: string;
    phone: string | null;
    photo_url: string | null;
  } | null;
}

export interface CoachTeam {
  id: number;
  coach_id: number;
  team_id: number;
}

export interface TeamPhoto {
  id: number;
  team_id: number;
  photo_url: string;
  caption: string | null;
  caption_en: string | null;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  uploaded_at: string;
  order: number;
}
