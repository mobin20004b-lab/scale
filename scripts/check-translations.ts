import { dictionaries, type Locale, SUPPORTED_LOCALES } from "../lib/i18n";

type KeyPaths = Set<string>;

function collectLeafPaths(value: unknown, prefix = ""): KeyPaths {
  const paths = new Set<string>();

  if (typeof value !== "object" || value === null) {
    if (prefix) paths.add(prefix);
    return paths;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    const nestedPaths = collectLeafPaths(nested, nextPrefix);
    for (const path of nestedPaths) paths.add(path);
  }

  return paths;
}

function diff(base: KeyPaths, target: KeyPaths): string[] {
  return [...base].filter((key) => !target.has(key));
}

function run() {
  const baseLocale: Locale = "fa";
  const basePaths = collectLeafPaths(dictionaries[baseLocale]);
  let hasError = false;

  for (const locale of SUPPORTED_LOCALES) {
    const localePaths = collectLeafPaths(dictionaries[locale]);
    const missing = diff(basePaths, localePaths);
    const extra = diff(localePaths, basePaths);

    if (missing.length > 0 || extra.length > 0) {
      hasError = true;
      console.error(`\n[${locale}] translation key mismatch`);
      if (missing.length > 0) console.error(`Missing keys:\n- ${missing.join("\n- ")}`);
      if (extra.length > 0) console.error(`Extra keys:\n- ${extra.join("\n- ")}`);
    }
  }

  if (hasError) {
    process.exitCode = 1;
    return;
  }

  console.log("All locales contain the same translation keys.");
}

run();
