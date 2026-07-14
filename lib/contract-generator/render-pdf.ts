import { chromium } from "playwright";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function renderContractPdf(
  html: string,
  opts?: { documentId?: string },
): Promise<Buffer> {
  // channel: "chromium" uses the full Chromium build (installed by
  // `playwright install chromium` and shipped in the Playwright image),
  // avoiding the separate chrome-headless-shell binary that isn't always
  // present on CI runners.
  const browser = await chromium.launch({ channel: "chromium", args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    // Page numbering lives here (footerTemplate), not in the document CSS:
    // Chromium's print-to-PDF does not support @page margin boxes.
    const docId = opts?.documentId ? escapeHtml(opts.documentId) : "";
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "16mm", right: "16mm" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="width: 100%; font-size: 7.5px; font-family: Arial, sans-serif; color: #666; padding: 0 16mm; display: flex; justify-content: space-between;">
        <span>${docId}</span>
        <span>Confidential | SOCIOS A.I USA LLC</span>
        <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>`,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
