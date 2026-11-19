function postgresCode(error: unknown): { code?: string; constraint?: string } {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth++) {
    const candidate = current as { code?: unknown; constraint_name?: unknown; cause?: unknown };
    if (typeof candidate.code === "string" && /^[0-9A-Z]{5}$/.test(candidate.code)) {
      return {
        code: candidate.code,
        constraint:
          typeof candidate.constraint_name === "string" ? candidate.constraint_name : undefined,
      };
    }
    current = candidate.cause;
  }
  return {};
}

export function uniqueViolation(error: unknown): string | null {
  const { code, constraint } = postgresCode(error);
  return code === "23505" ? (constraint ?? "") : null;
}
