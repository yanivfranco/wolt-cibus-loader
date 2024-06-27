import { Frame, Page } from "puppeteer";
import { logger } from "./logger";

export function getTestIdSelector(testId: string): string {
  return `[data-test-id="${testId}"]`;
}

export async function waitAndClick(page: Page | Frame, selector: string, error?: string) {
  await page.waitForSelector(selector).catch((e) => {
    if (error) {
      throw new Error(error);
    }
    throw e;
  });

  await page.click(selector);
}

export async function waitAndType(page: Page | Frame, selector: string, text: string, error?: string) {
  await page.waitForSelector(selector).catch((e) => {
    if (error) {
      throw new Error(error);
    }
    throw e;
  });

  await page.type(selector, text);
}

export async function doWithRetries<T>(fn: () => Promise<T>, errorMessage?: string, retries = 3, delay = 5000) {
  let retriesLeft = retries;
  while (retriesLeft > 0) {
    try {
      return await fn();
    } catch (error) {
      logger.warn({ error: error.message, errorMessage }, "Error while executing function, retrying...");
      retriesLeft--;
      if (retriesLeft > 0) {
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(errorMessage ?? "Could not execute function after 3 retries.");
}
