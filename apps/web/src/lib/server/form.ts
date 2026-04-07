export function getFormString(form: FormData, key: string) {
	const value = form.get(key);
	return typeof value === 'string' ? value : '';
}

export function getTrimmedFormString(form: FormData, key: string) {
	return getFormString(form, key).trim();
}

export function getOptionalTrimmedFormString(form: FormData, key: string) {
	return getTrimmedFormString(form, key) || null;
}

export function getFormNumber(form: FormData, key: string, fallback = Number.NaN) {
	const value = getTrimmedFormString(form, key);
	return value ? Number(value) : fallback;
}

export function parseRecordArray<T>(value: FormDataEntryValue | null): T[] {
	if (typeof value !== 'string' || !value.trim()) {
		return [];
	}

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? (parsed as T[]) : [];
	} catch {
		return [];
	}
}

export function parsePositiveUserId(
	value: FormDataEntryValue | string | null | undefined
): number | null {
	if (typeof value !== 'string') {
		return null;
	}

	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
