import chalk from "chalk";
import { appendFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

export async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastMessage = "";

export function logStatusMessage(transform: (a: string) => string, message: string) {
  if (message !== lastMessage) {
    logColor(transform, message);
  }
  lastMessage = message;
}

export function log(message: string, ...args: unknown[]) {
  logColor((a) => a, message, ...args);
}
export function logColor(transform: (a: string) => string, message: string, ...args: unknown[]) {
  const ts = `[${new Date().toLocaleTimeString()}]`;
  console.log(ts, transform(message), ...args);
  writeToLog(ts, message, ...args);
}
export function logError(e: unknown) {
  const msg =
    e instanceof Error ? `${e.name} ${e.cause} ${e.message}\n${e.stack}` : JSON.stringify(e);
  logColor(chalk.red, msg);
}

const date = new Date();
const logName = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDay()}.log`;

export function writeToLog(...messages: unknown[]) {
  const logDir = resolve(__dirname, "../logs");
  if (!existsSync(logDir)) {
    mkdirSync(logDir);
  }
  appendFileSync(
    resolve(logDir, logName),
    messages.map((m) => (typeof m === "string" ? m : JSON.stringify(m))).join(" ") + "\n",
    "utf-8"
  );
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
