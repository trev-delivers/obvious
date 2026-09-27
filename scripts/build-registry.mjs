#!/usr/bin/env node
/**
 * Builds the shadcn registry into dist/r/ from registry.json.
 *
 * Does what `shadcn build` does (inline each file's source into its item's
 * JSON) without adding shadcn as a dependency. The Vercel build copies
 * dist/r/ to the site, so an app can run:
 *
 *   npx shadcn add https://obvious-nine.vercel.app/r/sheet.json
 *
 * Two things are ours rather than shadcn's:
 *
 * - `registryDependencies` can name another item here by its bare name, and
 *   is rewritten to that item's full URL. Any other bare name (dialog,
 *   popover) is left alone and resolves to shadcn's own.
 * - `transitions` lists the transitions.dev snippets an item's markup
 *   expects. The CSS for those can't live here (the transitions.dev licence
 *   doesn't allow republishing it), so it's turned into the `docs` note
 *   shadcn prints after install, with the command that pulls them in.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(root, "registry.json"), "utf8"));
const out = join(root, "dist", "r");
const url = (name) => `${registry.homepage}/r/${name}.json`;
const names = new Set(registry.items.map((i) => i.name));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const item of registry.items) {
  const { transitions = [], ...rest } = item;
  const built = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    ...rest,
    registryDependencies: (item.registryDependencies ?? []).map((d) => (names.has(d) ? url(d) : d)),
    files: item.files.map((f) => ({ ...f, content: readFileSync(join(root, f.path), "utf8") })),
  };
  if (!built.registryDependencies.length) delete built.registryDependencies;
  if (transitions.length) {
    built.meta = { ...(built.meta ?? {}), transitions };
    built.docs =
      `${item.title} needs these transitions.dev snippets in the app:\n\n` +
      `  npx transitions-dev add ${transitions.join(" ")}\n\n` +
      `Import obvious's primitives and a theme before them, so the colours come from --ds-* tokens.`;
  }
  writeFileSync(join(out, `${item.name}.json`), JSON.stringify(built, null, 2) + "\n");
}

/* The index shadcn reads for `npx shadcn add @obvious/<name>` once the app
   has the registry in components.json. Items without file contents. */
writeFileSync(
  join(out, "registry.json"),
  JSON.stringify(
    {
      ...registry,
      items: registry.items.map(({ transitions, ...i }) => ({
        ...i,
        registryDependencies: i.registryDependencies?.map((d) => (names.has(d) ? url(d) : d)),
      })),
    },
    null,
    2,
  ) + "\n",
);

console.log(`registry: ${registry.items.length} items -> dist/r/`);
