import Handlebars from "handlebars";
import { chromium } from "playwright";

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
    // As fontes da marca chegam por @font-face data-URI e carregam de forma
    // assíncrona; networkidle não cobre a decodificação. Sem esta espera o
    // PDF pode sair na fonte fallback em runner lento.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    // Page numbering lives here (footerTemplate), not in the document CSS:
    // Chromium's print-to-PDF does not support @page margin boxes.
    const docId = opts?.documentId ? Handlebars.escapeExpression(opts.documentId) : "";
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "20mm", bottom: "26mm", left: "16mm", right: "16mm" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      // Linha de rubrica em TODAS as páginas (as duas partes rubricam) +
      // identificação do documento e numeração.
      footerTemplate: `<div style="width: 100%; font-size: 7.5px; font-family: Arial, sans-serif; color: #666; padding: 0 16mm;">
        <div style="text-align: right; margin-bottom: 4px; color: #444;">
          Initials / Rubrica: &nbsp;__________&nbsp;&nbsp;__________
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>${docId}</span>
          <span>Confidential | SOCIOS A.I USA LLC</span>
          <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
        </div>
      </div>`,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
