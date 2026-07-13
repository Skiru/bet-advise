import { Match } from '../../domain/match.entity';

export interface IMatchRepository {
  findById(id: string): Promise<Match | null>;
  findAll(): Promise<Match[]>;
  create(data: {
    homeTeam: string;
    awayTeam: string;
    kickoffAt: Date;
    externalId?: string;
    sport?: string;
    competition?: string;
    participants?: string[];
  }): Promise<Match>;
}

export const MATCH_REPOSITORY_PORT = Symbol('IMatchRepository');
