import Database from 'better-sqlite3';
import type { DatabaseClient, QueryParams } from './index.js';

export type SqliteDatabase = Database.Database;

export function createSqliteDatabaseClient(db: SqliteDatabase): DatabaseClient {
	return {
		async get<T>(sql: string, params: QueryParams = []) {
			const statement = db.prepare(sql);
			const row = statement.get(...params) as T | undefined;
			return row ?? null;
		},
		async all<T>(sql: string, params: QueryParams = []) {
			const statement = db.prepare(sql);
			return statement.all(...params) as T[];
		},
		async run(sql: string, params: QueryParams = []) {
			const statement = db.prepare(sql);
			const info = statement.run(...params);
			return {
				changes: Number(info.changes ?? 0),
				lastRowId: info.lastInsertRowid == null ? null : Number(info.lastInsertRowid)
			};
		}
	};
}

export const createSqliteClient = createSqliteDatabaseClient;

export function createInMemorySqlite() {
	const sqlite = new Database(':memory:');
	sqlite.pragma('foreign_keys = ON');
	return sqlite;
}

export function executeSqliteScript(db: SqliteDatabase, script: string) {
	db.exec(script);
}
