import type { DatabaseClient } from '@mentormatch/db';
import type { SessionUser } from '@mentormatch/shared';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Error {
			code?: string;
		}
		interface Locals {
			db: DatabaseClient | null;
			authSecret: string | null;
			requestId?: string;
			user: SessionUser | null;
		}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
