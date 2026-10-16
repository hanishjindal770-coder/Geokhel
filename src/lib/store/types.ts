export interface Player {
  id: string;
  nickname: string;
  state: string;
}

export interface GuessRow {
  playerId: string;
  day: string;
  idx: number;
  points: number;
  km: number;
  lat: number;
  lon: number;
}

export interface ResultRow {
  playerId: string;
  day: string;
  total: number;
  points: number[];
}

export interface BoardRow {
  playerId: string;
  nickname: string;
  state: string;
  total: number;
  points: number[];
}

export interface StateRow {
  state: string;
  players: number;
  average: number;
}

export interface Group {
  id: string;
  code: string;
  name: string;
  members?: number;
}

export interface Store {
  createPlayer(tokenHash: string, nickname: string, state: string): Promise<Player>;
  playerByTokenHash(tokenHash: string): Promise<Player | null>;
  updatePlayer(id: string, patch: { nickname?: string; state?: string }): Promise<Player>;

  guessesFor(playerId: string, day: string): Promise<GuessRow[]>;
  /** Returns false when that question was already answered (no second tries). */
  insertGuess(g: GuessRow): Promise<boolean>;

  saveResult(r: ResultRow): Promise<void>;
  resultDays(playerId: string): Promise<ResultRow[]>;

  /** Top results for a day, optionally limited to some players or one state. */
  board(day: string, opts: { limit: number; playerIds?: string[]; state?: string }): Promise<BoardRow[]>;
  resultFor(playerId: string, day: string): Promise<ResultRow | null>;
  stateBoard(day: string): Promise<StateRow[]>;

  createGroup(ownerId: string, name: string, code: string): Promise<Group>;
  groupByCode(code: string): Promise<Group | null>;
  joinGroup(groupId: string, playerId: string): Promise<void>;
  leaveGroup(groupId: string, playerId: string): Promise<void>;
  groupsFor(playerId: string): Promise<Group[]>;
  groupMemberIds(groupId: string): Promise<string[]>;
}
