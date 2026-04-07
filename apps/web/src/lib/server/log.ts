type LogLevel = 'info' | 'warn' | 'error';

function serializeError(error: unknown) {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack
		};
	}

	return {
		message: String(error)
	};
}

function writeLog(level: LogLevel, event: string, payload: Record<string, unknown> = {}) {
	const entry = JSON.stringify({
		level,
		event,
		timestamp: new Date().toISOString(),
		...payload
	});

	if (level === 'error') {
		console.error(entry);
		return;
	}

	if (level === 'warn') {
		console.warn(entry);
		return;
	}

	console.info(entry);
}

export function getRequestLogContext(
	locals: Pick<App.Locals, 'requestId' | 'user'>,
	extra: Record<string, unknown> = {}
) {
	return {
		requestId: locals.requestId,
		actorUserId: locals.user?.id ?? null,
		actorRole: locals.user?.role ?? null,
		...extra
	};
}

export function logInfo(event: string, payload: Record<string, unknown> = {}) {
	writeLog('info', event, payload);
}

export function logWarn(event: string, payload: Record<string, unknown> = {}) {
	writeLog('warn', event, payload);
}

export function logError(event: string, error: unknown, payload: Record<string, unknown> = {}) {
	writeLog('error', event, {
		...payload,
		error: serializeError(error)
	});
}
