export async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastMessage = "";

export function logStatusMessage(message: string) {
  if (message !== lastMessage) {
    log(message);
  }
  lastMessage = message;
}

export function log(...messages: unknown[]) {
  console.log(`[${new Date().toLocaleTimeString()}]`, ...messages);
}

export class UserError extends Error {}

export function getEnvironment() {
  const { BROWSER_PATH, CHANNEL_PAGE, DATA_FOLDER } = process.env;
  const required = { BROWSER_PATH, CHANNEL_PAGE, DATA_FOLDER };
  Object.entries(required).forEach(([key, value]) => {
    if (!value) {
      throw new UserError(`Please specify ${key} in .env`);
    }
  });

  return required as Record<keyof typeof required, string>;
}
