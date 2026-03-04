import { test as base, chromium } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

const IS_HEADLESS = true;
const SHOW_ALL_PLAYERS = false;

export const test = base.extend<{
  createPlayers: (n: number) => Promise<Page[]>;
}>({
  createPlayers: async ({}, use) => {
    const contexts: BrowserContext[] = [];

    const factory = async (n: number): Promise<Page[]> => {
      const pages: Page[] = [];

      for (let i = 0; i < n; i++) {
        const browser = await chromium.launch({
          headless: IS_HEADLESS || (!SHOW_ALL_PLAYERS && i !== 0),
        });

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
