import { Page } from "puppeteer";

type FindStreamResult = {
  isLive: boolean;
  url?: string;
};

type CheckStatusResult = {
  isChannelPage: boolean;
  loginUrl?: string;
  isStream: boolean;
  isStreamWaiting: boolean;
  isStreamRewards: boolean;
  isVideoIdMismatch: boolean;
};

type Action = "findStreams" | "checkStatus";
type ActionResult<T extends Action> = T extends "findStreams"
  ? FindStreamResult
  : CheckStatusResult;
type DispatchParams = { action: Action };

export async function checkStatus(page: Page): Promise<CheckStatusResult> {
  return dispatchAction(page, "checkStatus");
}

export async function findStreams(page: Page): Promise<FindStreamResult> {
  return dispatchAction(page, "findStreams");
}

async function dispatchAction<T extends Action>(page: Page, action: T) {
  return await page.evaluate<
    [DispatchParams],
    (params: DispatchParams) => ActionResult<T>
  >(
    (params): ActionResult<T> => {
      function getParentLink(el: HTMLElement) {
        let parent: HTMLElement | null | undefined = el;

        while (parent && parent.tagName !== "A") {
          parent = parent?.parentElement;
        }
        return (parent as HTMLAnchorElement | undefined)?.href;
      }
      function findStreams(): FindStreamResult {
        console.log(`[agent] finding livestreams...`);

        const live = document.querySelector<HTMLElement>(
          "[overlay-style=LIVE]"
        );
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
      }

      function checkStatus(): CheckStatusResult {
        console.log(`[agent] checking status...`);
        const rewardsButton = document.querySelector<HTMLElement>(
          ".ytd-account-link-button-renderer"
        );
        const loginButton = document.querySelector<HTMLElement>(
          '.ytd-masthead [href^="https://accounts.google.com"]'
        );
        const videoId = document.querySelector<HTMLMetaElement>(
          "meta[itemprop=videoId]"
        )?.content;
        const urlVideoId = new URLSearchParams(window.location.search).get("v");
        const isLiveStream = document.querySelector<HTMLMetaElement>(
          "meta[itemprop=isLiveBroadcast]"
        );
        const isPastLiveStream = document.querySelector<HTMLMetaElement>(
          "meta[itemprop=publication] meta[itemprop=endDate]"
        );
        const isLiveNowButton =
          document.querySelector<HTMLElement>(".ytp-live");
        const premierTrailerOverlay = document.querySelector<HTMLElement>(
          ".ytp-offline-slate-premiere-trailer"
        );

        const result = {
          isChannelPage: !!document.querySelector("#channel-container"),
          loginUrl: loginButton ? getParentLink(loginButton) : undefined,
          isStream: !!isLiveStream && !isPastLiveStream,
          isStreamWaiting:
            (!!isLiveNowButton && isLiveNowButton.style.display === "none") ||
            (!!premierTrailerOverlay &&
              premierTrailerOverlay.style.display !== "none"),
          isStreamRewards: rewardsButton?.innerText === "CONNECTED",
          isVideoIdMismatch:
            !!videoId && !!urlVideoId && videoId !== urlVideoId,
        };
        console.log(`[agent]`, result);
        return result;
      }

      const { action } = params;
      if (action === "findStreams") {
        // @ts-expect-error Not sure how to fix this
        return findStreams();
      }
      if (action === "checkStatus") {
        // @ts-expect-error Not sure how to fix this
        return checkStatus();
      }
      throw new Error(`Unknown action ${action}`);
    },
    { action }
  );
}
