import { chromium } from "playwright";

export async function renderContractPdf(html: string): Promise<Buffer> {
  // channel: "chromium" uses the full Chromium build (installed by
  // `playwright install chromium` and shipped in the Playwright image),
  // avoiding the separate chrome-headless-shell binary that isn't always
  // present on CI runners.
  const browser = await chromium.launch({ channel: "chromium", args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "16mm", right: "16mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
