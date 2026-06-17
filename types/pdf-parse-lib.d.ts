// Declaration for pdf-parse's internal implementation module.
// This subpath import bypasses index.js which runs debug test code
// that tries to open './test/data/05-versions-space.pdf' on startup.
declare module "pdf-parse/lib/pdf-parse" {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    text: string;
    version: string;
  }

  interface PDFOptions {
    /** Max number of pages to parse. 0 = all pages. */
    max?: number;
    /** Custom page renderer function. */
    pagerender?: (pageData: any) => Promise<string>;
  }

  function pdfParse(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  export = pdfParse;
}
