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
  videoId?: string;
  urlVideoId: string | null;
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
    (params: DispatchParams) => Promise<ActionResult<T>>
  >(
    (params): Promise<ActionResult<T>> => {
      function getParentLink(el: HTMLElement) {
        return (getParentEl(el, "a") as HTMLAnchorElement | undefined)?.href;
      }
      function getParentEl(el: HTMLElement, tagName: string) {
        let parent: HTMLElement | null | undefined = el;

        while (parent && parent.tagName !== tagName.toUpperCase()) {
          parent = parent?.parentElement;
        }
        return parent;
      }
      function findStreams(): FindStreamResult {
        console.log(`[agent] finding livestreams...`);

        const live = document.querySelector<HTMLElement>("[overlay-style=LIVE]");
        let link;

        if (live) {
          link = getParentLink(live);
        } else {
          const scheduled = document.querySelectorAll<HTMLElement>("[overlay-style=UPCOMING]");
          const sorted = Array.from(scheduled)
            .map((el: HTMLElement) => {
              const parent = getParentEl(el, "ytd-grid-video-renderer");
              if (!parent) {
                throw new Error("No video parent");
              }
              const metadata = parent.querySelector<HTMLDivElement>("#metadata-line");
              if (!metadata) {
                return undefined;
              }
              const text = metadata.innerText;
              const [, date] = text.split(/Premieres\s+/);
              if (!date) {
                return undefined;
              }
              return {
                el,
                date: new Date(date),
              };
            })
            .sort((a?: { date?: Date }, b?: { date?: Date }) => {
              const [dateA, dateB] = [a, b].map((el) => el?.date);
              if (dateA === dateB) {
                return 0;
              }
              if (!dateA) {
                return 1;
              }
              if (!dateB) {
                return -1;
              }
              return dateA < dateB ? -1 : 1;
            });
          console.log(sorted);
          const [firstScheduled] = sorted;
          console.log(firstScheduled);
          link = firstScheduled ? getParentLink(firstScheduled.el) : undefined;
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
          "[itemprop=publication] meta[itemprop=endDate]"
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
          isStreamRewards: rewardsButton?.innerText?.toUpperCase() === "CONNECTED",
          videoId,
          urlVideoId,
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
