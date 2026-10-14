/**
 * Planification interne (ADR 0015) : tâches à cadence propre, exécutées en séquence,
 * par une seule instance grâce à un verrou Postgres de session.
 */
import { writeFile } from 'node:fs/promises';

import { SQL } from 'bun';

import { errorMessage, log } from './log';

export interface Task {
  name: string;
  everyMs: number;
  run: () => Promise<unknown>;
}

/**
 * Retire du résultat journalisé un compteur d'échecs vide (`failed: 0` ou `[]`). Coolify
 * classe les lignes en erreur d'après leur contenu : un « failed » vide ferait passer
 * chaque cycle réussi pour une erreur. Un échec réel reste journalisé.
 */
export function withoutEmptyFailures(result: unknown): unknown {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return result;
  const { failed, ...rest } = result as Record<string, unknown>;
  const empty = failed === 0 || (Array.isArray(failed) && failed.length === 0);
  return empty || failed === undefined ? rest : { ...rest, failed };
}

export class Scheduler {
  private lastRun = new Map<string, number>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(
    private readonly tasks: Task[],
    private readonly tickMs: number,
    private readonly heartbeatFile?: string,
  ) {}

  /** Pulsation lue par le healthcheck : la boucle est vivante. */
  async beat(): Promise<void> {
    if (this.heartbeatFile) await writeFile(this.heartbeatFile, new Date().toISOString());
  }

  /**
   * Exécute les tâches dues ; l'échec d'une tâche n'empêche pas les suivantes. La
   * pulsation est écrite avant chaque tâche : une tâche longue mais bornée ne fait pas
   * passer le worker pour mort.
   */
  async tick(now = Date.now()): Promise<string[]> {
    if (this.running) return [];
    this.running = true;
    const ran: string[] = [];
    try {
      for (const task of this.tasks) {
        const last = this.lastRun.get(task.name);
        if (last !== undefined && now - last < task.everyMs) continue;
        this.lastRun.set(task.name, now);
        ran.push(task.name);
        await this.beat();
        const start = Date.now();
        try {
          const result = await task.run();
          log.info('tâche terminée', {
            task: task.name,
            ms: Date.now() - start,
            result: withoutEmptyFailures(result),
          });
        } catch (error) {
          log.error('tâche en échec', { task: task.name, error: errorMessage(error) });
        }
      }
      await this.beat();
    } finally {
      this.running = false;
    }
    return ran;
  }

  start(): void {
    const loop = async () => {
      await this.tick();
      this.timer = setTimeout(loop, this.tickMs);
    };
    void loop();
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

/**
 * Verrou de leader : une connexion dédiée garde un advisory lock de session.
 * Une seconde instance n'obtient pas le verrou et reste en attente.
 */
export async function tryAcquireLeaderLock(
  url: string,
  key: number,
): Promise<{ acquired: boolean; release: () => Promise<void> }> {
  const conn = new SQL({ url, max: 1 });
  const [row] = (await conn`select pg_try_advisory_lock(${key}) as acquired`) as {
    acquired: boolean;
  }[];
  const acquired = row?.acquired === true;
  if (!acquired) await conn.close();
  return {
    acquired,
    release: async () => {
      if (!acquired) return;
      await conn`select pg_advisory_unlock(${key})`;
      await conn.close();
    },
  };
}
