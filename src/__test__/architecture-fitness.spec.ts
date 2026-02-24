import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it, expect } from "vitest";

function getFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      getFiles(path, files);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      files.push(path);
    }
  }
  return files;
}

describe("Clean Architecture Fitness Functions", () => {
  const domainDir = join(process.cwd(), "src/domain");

  it("domain must not import from infrastructure", () => {
    const domainFiles = getFiles(domainDir);

    const infrastructureImports: string[] = [];

    const importRegex =
      /import\s+.*?\s+from\s+['"](.*?)['"]|require\s*\(\s*['"](.*?)['"]\s*\)/g;

    for (const file of domainFiles) {
      const content = readFileSync(file, "utf-8");

      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1] || match[2];
        if (
          importPath &&
          (importPath.includes("/infrastructure") ||
            importPath.startsWith("infrastructure") ||
            (importPath.startsWith("..") &&
              importPath.includes("infrastructure")))
        ) {
          infrastructureImports.push(
            `${relative(process.cwd(), file)} -> ${importPath}`,
          );
        }
      }
    }

    expect(infrastructureImports).toEqual([]);
  });
});
