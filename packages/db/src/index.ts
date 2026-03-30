export type QueryParams = Array<string | number | null | undefined>;

export interface QueryResult {
  changes: number;
  lastRowId: number | null;
}

export interface DatabaseClient {
  get<T>(sql: string, params?: QueryParams): Promise<T | null>;
  all<T>(sql: string, params?: QueryParams): Promise<T[]>;
  run(sql: string, params?: QueryParams): Promise<QueryResult>;
}

type D1Prepared = {
  bind: (...params: QueryParams) => D1Prepared;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results?: T[] }>;
  run: () => Promise<{ meta?: { changes?: number; last_row_id?: number } }>;
};

type D1DatabaseLike = {
  prepare: (sql: string) => D1Prepared;
};

export function createD1DatabaseClient(db: D1DatabaseLike): DatabaseClient {
  return {
    async get<T>(sql: string, params: QueryParams = []) {
      const row = await db.prepare(sql).bind(...params).first<T>();
      return row ?? null;
    },
    async all<T>(sql: string, params: QueryParams = []) {
      const result = await db.prepare(sql).bind(...params).all<T>();
      return Array.isArray(result.results) ? result.results : [];
    },
    async run(sql: string, params: QueryParams = []) {
      const result = await db.prepare(sql).bind(...params).run();
      return {
        changes: Number(result.meta?.changes ?? 0),
        lastRowId:
          result.meta?.last_row_id == null ? null : Number(result.meta.last_row_id)
      };
    }
  };
}

export const createD1Client = createD1DatabaseClient;
