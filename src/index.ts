import chalk from "chalk";
import { config } from "dotenv";
import { Page, PuppeteerLaunchOptions } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { checkStatus, findStreams } from "./client";
import { goToChannelPage, safeGoTo, safeReload } from "./puppeteer-utils";
import { getEnvironment, log, logColor, logError, logStatusMessage, UserError, wait } from "./util";

config();

const { BROWSER_PATH, CHANNEL_PAGE, DATA_FOLDER } = getEnvironment();

async function main() {
  try {
    await init();
  } catch (e) {
    if (e instanceof UserError) {
      logError(e.message);
    } else {
      logError(e);
    }
  }
}

async function init() {
  puppeteer.use(StealthPlugin());

  const args: string[] = [];
  if (process.env.PROFILE_FOLDER) {
    args.push(`--profile-directory=${process.env.PROFILE_FOLDER}`);
  }
  const options: PuppeteerLaunchOptions = {
    executablePath: BROWSER_PATH,
    userDataDir: DATA_FOLDER,
    headless: false,
    args,
  };

  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();

  // This will go on forever until the browser or server is terminated
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await loop(page);
    await wait(1000 * 5);
  }
}

let askLogin = false;
async function loop(page: Page) {
  let status = await checkStatus(page);

  if (status.isVideoIdMismatch) {
    logColor(
      chalk.yellow,
      `Video ID ${status.videoId} does not match URL ${status.urlVideoId}, refreshing page for updated metadata`
    );
    return await safeReload(page, CHANNEL_PAGE);
  }

  if (status.loginUrl && !askLogin) {
    askLogin = true;
    logColor(chalk.yellow, `User not logged in. Prompting in browser for login...`);
    const confirm = await page.evaluate(() => {
      return window.confirm(
        `[Autowatch Live] It looks like you're not logged in. You can't earn rewards without being logged in. Would you like to login now?`
      );
    });

    if (confirm) {
      await safeGoTo(page, status.loginUrl);
      do {
        log("Waiting for login to complete...");
        await wait(1000 * 5);
        status = await checkStatus(page);
      } while (!(status.isChannelPage || status.isStream));
    }
  }

  if (!status.isStream && !status.isChannelPage) {
    return await goToChannelPage(page, CHANNEL_PAGE);
  }

  if (status.isChannelPage) {
    const streams = await findStreams(page);

    if (streams?.url) {
      logColor(
        chalk.green,
        `${streams.isLive ? "Live" : "Scheduled"} stream detected, going to ${streams.url}`
      );
      return await safeGoTo(page, streams.url);
    } else {
      logColor(chalk.yellow, `Could not find any streams right now`);
      await wait(1000 * 30);
      return await safeReload(page, CHANNEL_PAGE);
    }
  }

  if (status.isStream) {
    if (status.isStreamWaiting) {
      logStatusMessage(chalk.blue, "Waiting for stream to begin...");
    } else if (status.isStreamRewards) {
      logStatusMessage(chalk.green, `Stream has begun and rewards detected`);
    } else {
      logStatusMessage(chalk.yellow, `Stream has begun but no rewards detected`);
      if (process.env.REFRESH_NO_REWARDS) {
        await wait(1000 * 30);
        return await safeReload(page, CHANNEL_PAGE);
      }
    }
  }
}

main();
