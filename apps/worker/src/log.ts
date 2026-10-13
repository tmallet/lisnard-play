/** Journalisation structurée (JSON par ligne), lisible dans les logs Coolify. */
type Level = 'info' | 'warn' | 'error';

function write(level: Level, msg: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...data });
  if (level === 'error') console.error(line);
  else console.log(line);
}

export const log = {
  info: (msg: string, data?: Record<string, unknown>) => write('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => write('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => write('error', msg, data),
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
