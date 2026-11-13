// Hook PostToolUse (Write|Edit): pasa el archivo por Prettier y ESLint.
// Solo aplica a este proyecto (se registra en .claude/settings.json).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname, relative, resolve, sep } from "node:path";
const PRETTIER_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".md",
  ".mdx",
  ".html",
  ".yml",
  ".yaml",
]);
const STRIP_BLANK_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".json",
]);
const ESLINT_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const SKIP_DIRS = [
  "node_modules",
  ".next",
  "out",
  "build",
  "references",
  ".git",
];
let raw = "";
for await (const chunk of process.stdin) raw += chunk;
let filePath;
try {
  filePath = JSON.parse(raw)?.tool_input?.file_path;
} catch {
  process.exit(0);
}
if (!filePath) process.exit(0);
const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const file = resolve(filePath);
const rel = relative(root, file);
// Fuera del proyecto, inexistente o en carpetas ignoradas.
if (rel.startsWith("..") || resolve(rel) === rel || !existsSync(file))
  process.exit(0);
if (rel.split(sep).some((part) => SKIP_DIRS.includes(part))) process.exit(0);
const ext = extname(file).toLowerCase();
// 1) Quitar líneas en blanco (código conciso). En Markdown/HTML/YAML se conservan,
//    porque ahí las líneas en blanco tienen significado (párrafos, listas, bloques).
//    Dentro de template literals (`...`) también se conservan: son contenido.
if (STRIP_BLANK_EXT.has(ext)) {
  const original = readFileSync(file, "utf8");
  let inTemplate = false;
  const kept = original.split("\n").filter((line) => {
    const keep = inTemplate || line.trim() !== "";
    const ticks = (line.replace(/\\./g, "").match(/`/g) ?? []).length;
    if (ticks % 2 === 1) inTemplate = !inTemplate;
    return keep;
  });
  const stripped = kept.join("\n");
  if (stripped !== original) writeFileSync(file, stripped);
}

const run = (bin, args) =>
  spawnSync(process.execPath, [resolve(root, "node_modules", bin), ...args], {
    cwd: root,
    encoding: "utf8",
  });

if (PRETTIER_EXT.has(ext)) {
  const r = run("prettier/bin/prettier.cjs", [
    "--write",
    "--log-level",
    "warn",
    file,
  ]);
  if (r.status !== 0) {
    process.stderr.write(`Prettier falló en ${rel}:\n${r.stderr || r.stdout}`);
    process.exit(2);
  }
}

if (ESLINT_EXT.has(ext)) {
  const r = run("eslint/bin/eslint.js", ["--fix", file]);
  if (r.status !== 0) {
    process.stderr.write(
      `ESLint encontró problemas en ${rel}:\n${r.stdout}${r.stderr}`,
    );
    process.exit(2);
  }
}
