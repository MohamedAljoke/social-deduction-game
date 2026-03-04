import { test as base } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

export const test = base.extend<{
  createPlayers: (n: number) => Promise<Page[]>;
}>({
  createPlayers: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];

    const factory = async (n: number): Promise<Page[]> => {
      const pages: Page[] = [];

      for (let i = 0; i < n; i++) {
        const context = await browser.newContext();
        contexts.push(context);

        const page = await context.newPage();
        pages.push(page);
      }

      return pages;
    };

    await use(factory);

    await Promise.all(contexts.map((ctx) => ctx.close()));
  },
});

export { expect } from "@playwright/test";
