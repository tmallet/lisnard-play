/**
 * Contrôle de cohérence de la documentation (design D8 et D9, ADR 0008).
 * Liste toutes les incohérences détectées et échoue (code 1) s'il y en a :
 *
 * - ADR : frontmatter complet et valide, id cohérent avec le nom de fichier ;
 * - index docs/decisions/README.md : une ligne par ADR, statut identique ;
 * - supersedes / superseded-by réciproques ;
 * - liens Markdown relatifs non cassés (docs/, AGENTS.md, AGENTS.md de module, skills) ;
 * - skills : name + description, présence dans .claude/skills/, symlinks valides ;
 * - versions d'outils : .tool-versions = packageManager = engines.
 */
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);
const rel = (p: string) => relative(ROOT, p);
const read = (p: string) => readFileSync(p, 'utf8');

function frontmatter(path: string): Record<string, unknown> | null {
  const match = read(path).match(/^---\n([\s\S]*?)\n---\n/);
  if (!match?.[1]) return null;
  try {
    return Bun.YAML.parse(match[1]) as Record<string, unknown>;
  } catch (e) {
    fail(`${rel(path)} : frontmatter YAML invalide (${(e as Error).message})`);
    return null;
  }
}

function walk(dir: string, filter: (p: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    if (entry.isDirectory()) return walk(p, filter);
    return filter(p) ? [p] : [];
  });
}

// ─── ADR ────────────────────────────────────────────────────────────────────
const DECISIONS = join(ROOT, 'docs/decisions');
const STATUSES = ['proposed', 'accepted', 'superseded', 'deprecated'];
const REQUIRED = [
  'id',
  'title',
  'status',
  'date',
  'tags',
  'supersedes',
  'superseded-by',
  'related-specs',
  'related-changes',
];

const adrFiles = readdirSync(DECISIONS).filter((f) => /^\d{4}-.+\.md$/.test(f));
const adrs = new Map<
  string,
  { file: string; status: string; supersedes: unknown; supersededBy: unknown }
>();

for (const file of adrFiles) {
  const path = join(DECISIONS, file);
  const fm = frontmatter(path);
  if (!fm) {
    fail(`${rel(path)} : frontmatter absent`);
    continue;
  }
  for (const key of REQUIRED) if (!(key in fm)) fail(`${rel(path)} : clé « ${key} » manquante`);
  const id = String(fm.id ?? '');
  if (id !== file.slice(0, 4)) fail(`${rel(path)} : id « ${id} » ≠ préfixe du fichier`);
  const status = String(fm.status ?? '');
  if (!STATUSES.includes(status)) fail(`${rel(path)} : statut « ${status} » invalide`);
  const date = fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : String(fm.date ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    fail(`${rel(path)} : date « ${date} » invalide (AAAA-MM-JJ)`);
  for (const key of ['tags', 'related-specs', 'related-changes']) {
    if (key in fm && !Array.isArray(fm[key])) fail(`${rel(path)} : « ${key} » doit être une liste`);
  }
  adrs.set(id, { file, status, supersedes: fm.supersedes, supersededBy: fm['superseded-by'] });
}

// Réciprocité supersedes / superseded-by.
for (const [id, adr] of adrs) {
  if (adr.supersedes != null) {
    const target = adrs.get(String(adr.supersedes));
    if (!target) fail(`ADR ${id} : supersedes « ${adr.supersedes} » introuvable`);
    else if (String(target.supersededBy) !== id)
      fail(`ADR ${adr.supersedes} : superseded-by devrait valoir « ${id} »`);
  }
  if (adr.supersededBy != null) {
    const target = adrs.get(String(adr.supersededBy));
    if (!target) fail(`ADR ${id} : superseded-by « ${adr.supersededBy} » introuvable`);
    else if (String(target.supersedes) !== id)
      fail(`ADR ${adr.supersededBy} : supersedes devrait valoir « ${id} »`);
    if (adr.status !== 'superseded') fail(`ADR ${id} : remplacé mais statut « ${adr.status} »`);
  }
}

// Index.
const indexRows = new Map<string, { link: string; status: string }>();
for (const line of read(join(DECISIONS, 'README.md')).split('\n')) {
  const m = line.match(/^\|\s*\[(\d{4})\]\(([^)]+)\)\s*\|[^|]*\|\s*([a-z]+)\s*\|/);
  if (m?.[1] && m[2] && m[3]) {
    if (indexRows.has(m[1])) fail(`Index des ADR : ${m[1]} listé plusieurs fois`);
    indexRows.set(m[1], { link: m[2], status: m[3] });
  }
}
for (const [id, adr] of adrs) {
  const row = indexRows.get(id);
  if (!row) fail(`Index des ADR : ${id} absent`);
  else {
    if (row.link !== adr.file)
      fail(`Index des ADR : ${id} pointe vers « ${row.link} » au lieu de « ${adr.file} »`);
    if (row.status !== adr.status)
      fail(`Index des ADR : ${id} indique « ${row.status} », le fichier « ${adr.status} »`);
  }
}
for (const id of indexRows.keys())
  if (!adrs.has(id)) fail(`Index des ADR : ${id} ne correspond à aucun fichier`);

// ─── Liens Markdown relatifs ────────────────────────────────────────────────
const SKILLS = join(ROOT, '.agents/skills');
const mdFiles = [
  join(ROOT, 'AGENTS.md'),
  ...walk(join(ROOT, 'docs'), (p) => p.endsWith('.md')),
  ...['apps', 'packages'].flatMap((d) =>
    existsSync(join(ROOT, d))
      ? readdirSync(join(ROOT, d)).map((m) => join(ROOT, d, m, 'AGENTS.md'))
      : [],
  ),
  ...(existsSync(SKILLS) ? readdirSync(SKILLS).map((s) => join(SKILLS, s, 'SKILL.md')) : []),
].filter((p) => existsSync(p));

for (const path of mdFiles) {
  // Retire les blocs de code pour ne pas analyser les exemples.
  const content = read(path)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');
  for (const m of content.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1]?.split('#')[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    const resolved = resolve(dirname(path), target.split(':')[0] ?? target);
    if (!existsSync(resolved)) fail(`${rel(path)} : lien cassé « ${m[1]} »`);
  }
}

// ─── Skills ─────────────────────────────────────────────────────────────────
const CLAUDE_SKILLS = join(ROOT, '.claude/skills');
if (existsSync(SKILLS)) {
  for (const name of readdirSync(SKILLS).filter((n) => !n.startsWith('.'))) {
    const skillFile = join(SKILLS, name, 'SKILL.md');
    if (!existsSync(skillFile)) {
      fail(`${rel(join(SKILLS, name))} : SKILL.md manquant`);
      continue;
    }
    const fm = frontmatter(skillFile);
    if (!fm?.name || !fm?.description)
      fail(`${rel(skillFile)} : « name » et « description » obligatoires`);
    else if (fm.name !== name)
      fail(`${rel(skillFile)} : name « ${fm.name} » ≠ dossier « ${name} »`);
    if (!existsSync(join(CLAUDE_SKILLS, name)))
      fail(`.claude/skills/${name} manquant (symlink attendu)`);
  }
}
if (existsSync(CLAUDE_SKILLS)) {
  for (const name of readdirSync(CLAUDE_SKILLS)) {
    const p = join(CLAUDE_SKILLS, name);
    if (lstatSync(p).isSymbolicLink()) {
      if (!existsSync(p)) fail(`.claude/skills/${name} : symlink cassé`);
      else if (!statSync(p).isDirectory() || !realpathSync(p).startsWith(realpathSync(SKILLS)))
        fail(`.claude/skills/${name} : doit pointer vers .agents/skills/${name}`);
    }
  }
}

// ─── Versions d'outils ──────────────────────────────────────────────────────
const toolVersions = Object.fromEntries(
  read(join(ROOT, '.tool-versions'))
    .split('\n')
    .map((l) => l.trim().split(/\s+/))
    .filter((parts) => parts.length >= 2 && !parts[0]?.startsWith('#')),
) as Record<string, string>;
const pkg = JSON.parse(read(join(ROOT, 'package.json'))) as {
  packageManager?: string;
  engines?: Record<string, string>;
};
if (!toolVersions.bun || !toolVersions.nodejs) fail('.tool-versions : bun et nodejs obligatoires');
if (pkg.packageManager !== `bun@${toolVersions.bun}`)
  fail(
    `package.json : packageManager « ${pkg.packageManager} » ≠ bun@${toolVersions.bun} (.tool-versions)`,
  );
if (pkg.engines?.bun !== toolVersions.bun)
  fail(`package.json : engines.bun « ${pkg.engines?.bun} » ≠ ${toolVersions.bun} (.tool-versions)`);
if (pkg.engines?.node !== toolVersions.nodejs)
  fail(
    `package.json : engines.node « ${pkg.engines?.node} » ≠ ${toolVersions.nodejs} (.tool-versions)`,
  );

// Dockerfiles : ARG BUN_VERSION identique à .tool-versions (ADR 0010, ADR 0015).
for (const dockerfile of ['apps/app/Dockerfile', 'apps/worker/Dockerfile']) {
  const path = join(ROOT, dockerfile);
  if (!existsSync(path)) continue;
  const version = read(path).match(/^ARG BUN_VERSION=(\S+)/m)?.[1];
  if (version !== toolVersions.bun)
    fail(`${dockerfile} : BUN_VERSION « ${version} » ≠ ${toolVersions.bun} (.tool-versions)`);
}

// ─── Résultat ───────────────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error(`docs:check : ${errors.length} problème(s)\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(
  `docs:check : OK (${adrs.size} ADR, ${mdFiles.length} fichiers Markdown, versions d'outils cohérentes)`,
);
