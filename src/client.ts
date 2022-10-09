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
        const offlineSlate =
          document.querySelector<HTMLElement>(".ytp-offline-slate");
        const rewardsButton = document.querySelector<HTMLElement>(
          ".ytd-account-link-button-renderer"
        );
        const loginButton = document.querySelector<HTMLElement>(
          '.ytd-masthead [href^="https://accounts.google.com"]'
        );
        const chatFrame =
          document.querySelector<HTMLIFrameElement>("#chatframe");
        // Make sure stream hasn't ended
        const isStream =
          !!chatFrame && !chatFrame.src.includes("live_chat_replay");

        const result = {
          isChannelPage: !!document.querySelector("#channel-container"),
          loginUrl: loginButton ? getParentLink(loginButton) : undefined,
          isStream,
          isStreamWaiting: offlineSlate?.style?.display !== "none",
          isStreamRewards: rewardsButton?.innerText === "CONNECTED",
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
