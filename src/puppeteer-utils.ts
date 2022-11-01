import chalk from "chalk";
import { Page } from "puppeteer";
import { logColor, logError } from "./util";

export async function goToChannelPage(page: Page, channel: string) {
  // Go to the channel and look for a stream
  const videosPage = channel.endsWith("/streams") ? channel : `${channel}/streams`;
  logColor(chalk.yellow, `No live stream detected, going to channel ${videosPage}`);
  await safeGoTo(page, videosPage, { waitUntil: "domcontentloaded" });
}

export async function safeGoTo(page: Page, ...args: Parameters<Page["goto"]>) {
  return await safeGoToImpl(0, page, ...args);
}

async function safeGoToImpl(tries: number, page: Page, ...args: Parameters<Page["goto"]>) {
  try {
    await page.goto(...args);
  } catch (e) {
    // Catching timeout error
    logError(e);
    if (tries < 3) {
      await safeGoToImpl(tries + 1, page, ...args);
    }
  }
}

export async function safeReload(page: Page, fallbackPage: string) {
  try {
    await page.reload();
  } catch (e) {
    // Catching timeout error
    logError(e);
    await goToChannelPage(page, fallbackPage);
  }
}
