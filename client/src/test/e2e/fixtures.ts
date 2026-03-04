import { test as base } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

export const test = base.extend<{
  createPlayers: (n: number) => Promise<Page[]>;
}>({
  createPlayers: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];

    const factory = async (n: number): Promise<Page[]> => {
      const ctxs = await Promise.all(
        Array.from({ length: n }, () => browser.newContext()),
      );
      contexts.push(...ctxs);
      return Promise.all(ctxs.map((ctx) => ctx.newPage()));
    };

    await use(factory);

    await Promise.all(contexts.map((ctx) => ctx.close()));
  },
});

export { expect } from "@playwright/test";
