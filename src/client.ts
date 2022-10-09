import { Page } from "puppeteer";

export async function findStreams(page: Page) {
  // Check for livestreams
  return await page.evaluate(() => {
    console.log(`[agent] finding livestreams...`);

    function getParentLink(el: HTMLElement) {
      let parent: HTMLElement | null | undefined = el;

      if (live) {
        do {
          parent = parent?.parentElement;
        } while (parent && parent.tagName !== "A");
      }
      return (parent as HTMLAnchorElement | undefined)?.href;
    }

    const live = document.querySelector<HTMLElement>("[overlay-style=LIVE]");
    let link;

    if (live) {
      link = getParentLink(live);
    } else {
      const scheduled = document.querySelector<HTMLElement>(
        "[overlay-style=UPCOMING]"
      );
      link = scheduled ? getParentLink(scheduled) : undefined;
    }

    const result = {
      isLive: !!live,
      url: link,
    };
    console.log(`[agent]`, result);
    return result;
  });
}

export async function checkStatus(page: Page) {
  return await page.evaluate(() => {
    console.log(`[agent] checking status...`);
    const offlineSlate =
      document.querySelector<HTMLElement>(".ytp-offline-slate");
    const rewardsButton = document.querySelector<HTMLElement>(
      ".ytd-account-link-button-renderer"
    );

    const result = {
      isChannelPage: !!document.querySelector("#channel-container"),
      isStream: !!document.querySelector("#chatframe"),
      isStreamWaiting: offlineSlate?.style?.display !== "none",
      isStreamRewards: rewardsButton?.innerText === "CONNECTED",
    };
    console.log(`[agent]`, result);
    return result;
  });
}
