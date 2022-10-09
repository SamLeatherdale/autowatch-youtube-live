//save cookie function
import { readFileSync, writeFileSync } from "fs";
import { Page } from "puppeteer";

export async function saveCookies(page: Page) {
  const cookies = await page.cookies();
  const cookieJson = JSON.stringify(cookies, null, 2);
  writeFileSync("cookies.json", cookieJson, "utf-8");
}

//load cookie function
export async function loadCookies(page: Page) {
  const cookieJson = readFileSync("cookies.json", "utf-8");
  const cookies = JSON.parse(cookieJson);
  await page.setCookie(...cookies);
}
