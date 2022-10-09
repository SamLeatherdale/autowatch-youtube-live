import chalk from "chalk";
import { config } from "dotenv";
import { Page, PuppeteerLaunchOptions } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { checkStatus, findStreams } from "./client";
import { getEnvironment, log, logStatusMessage, UserError, wait } from "./util";

config();

const { BROWSER_PATH, CHANNEL_PAGE, DATA_FOLDER } = getEnvironment();

async function main() {
  try {
    await init();
  } catch (e) {
    if (e instanceof UserError) {
      console.error(chalk.red(e.message));
    } else {
      console.error(e);
    }
  }
}

async function init() {
  puppeteer.use(StealthPlugin());
  const options: PuppeteerLaunchOptions = {
    executablePath: BROWSER_PATH,
    userDataDir: DATA_FOLDER,
    headless: false,
    devtools: true,
    args: [],
  };
  if (process.env.PROFILE_FOLDER) {
    options.args!.push(`--profile-directory=${process.env.PROFILE_FOLDER}`);
  }
  const browser = await puppeteer.launch(options);

  const page = await browser.newPage();

  while (true) {
    await loop(page);
    await wait(1000 * 5);
  }
}
main();

async function loop(page: Page) {
  const status = await checkStatus(page);

  if (!status.isStream && !status.isChannelPage) {
    // Go to the channel and look for a stream
    log(chalk.yellow`No live stream detected, going to channel page`);
    await goToChannelPage(page);
  }

  if (!status.isStream && status.isChannelPage) {
    const streams = await findStreams(page);

    if (streams?.url) {
      log(
        chalk.green`${
          streams.isLive ? "Live" : "Scheduled"
        } stream detected, redirecting...`
      );
      await page.goto(streams.url);
    } else {
      log(chalk.yellow`Could not find any streams right now`);
      await wait(1000 * 30);
      await page.reload();
    }
  }

  if (status.isStream) {
    if (status.isStreamWaiting) {
      logStatusMessage("Waiting for stream to begin...");
    } else if (status.isStreamRewards) {
      logStatusMessage(chalk.green`Stream has begun and rewards detected`);
    } else {
      logStatusMessage(chalk.yellow`Stream has begun but no rewards detected`);
      if (process.env.REFRESH_NO_REWARDS) {
        await wait(1000 * 30);
        await page.reload();
      }
    }
  }
}

async function goToChannelPage(page: Page) {
  await page.goto(CHANNEL_PAGE, { waitUntil: "domcontentloaded" });
}
