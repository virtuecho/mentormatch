export type QueryParams = Array<string | number | null | undefined>;

export interface QueryResult {
  changes: number;
  lastRowId: number | null;
}

export interface BatchStatement {
  sql: string;
  params?: QueryParams;
}

export interface DatabaseClient {
  get<T>(sql: string, params?: QueryParams): Promise<T | null>;
  all<T>(sql: string, params?: QueryParams): Promise<T[]>;
  run(sql: string, params?: QueryParams): Promise<QueryResult>;
  batch(statements: BatchStatement[]): Promise<QueryResult[]>;
}

type D1Prepared = {
  bind: (...params: QueryParams) => D1Prepared;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results?: T[] }>;
  run: () => Promise<{ meta?: { changes?: number; last_row_id?: number } }>;
};

type D1DatabaseLike = {
  prepare: (sql: string) => D1Prepared;
  batch?: (
    statements: D1Prepared[],
  ) => Promise<Array<{ meta?: { changes?: number; last_row_id?: number } }>>;
};

export function createD1DatabaseClient(db: D1DatabaseLike): DatabaseClient {
  const mapResult = (result: {
    meta?: { changes?: number; last_row_id?: number };
  }) => ({
    changes: Number(result.meta?.changes ?? 0),
    lastRowId:
      result.meta?.last_row_id == null ? null : Number(result.meta.last_row_id),
  });

  return {
    async get<T>(sql: string, params: QueryParams = []) {
      const row = await db
        .prepare(sql)
        .bind(...params)
        .first<T>();
      return row ?? null;
    },
    async all<T>(sql: string, params: QueryParams = []) {
      const result = await db
        .prepare(sql)
        .bind(...params)
        .all<T>();
      return Array.isArray(result.results) ? result.results : [];
    },
    async run(sql: string, params: QueryParams = []) {
      const result = await db
        .prepare(sql)
        .bind(...params)
        .run();
      return mapResult(result);
    },
    async batch(statements: BatchStatement[]) {
      if (typeof db.batch === "function") {
        const results = await db.batch(
          statements.map((statement) =>
            db.prepare(statement.sql).bind(...(statement.params ?? [])),
          ),
        );

        return results.map(mapResult);
      }

      const results: QueryResult[] = [];
      for (const statement of statements) {
        results.push(await this.run(statement.sql, statement.params));
      }
      return results;
    },
  };
}

export const createD1Client = createD1DatabaseClient;
