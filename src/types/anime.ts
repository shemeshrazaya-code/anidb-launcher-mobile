export interface AnimeDetail {
  aid: number;
  title: string;
  description: string;
  rating: number | null;
  ratingCount: number | null;
  pictureUrl: string | null;
  type: string | null;
  episodeCount: number | null;
  genres: string[] | null;
  season: string | null;
  isAdult: boolean;
  startDate: string | null;
  altTitles: string[] | null;
}
