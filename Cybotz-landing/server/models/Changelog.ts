export interface IChangelog {
  _id?: string;
  action: string;
  category: "Reservations" | "Blogs" | "Curriculums" | "Changelogs" | "System";
  description: string;
  username: string;
  role: string;
  details?: Record<string, any>;
  createdAt: Date;
}

export { Changelog } from "./db.js";
