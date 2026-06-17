const fs = require('fs');
const path = require('path');
const https = require('https');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function test() {
  const pdfUrl = "https://khtyudpcrucqgfxhgufg.supabase.co/storage/v1/object/public/resumes/4493af31-8262-4dd3-b49a-809452b54aad/1781614703772-pxr05ne.pdf";
  const localPdf = path.join(__dirname, 'temp_resume.pdf');
  
  console.log("Downloading PDF...");
  await download(pdfUrl, localPdf);
  console.log("Downloaded to", localPdf);

  const buffer = fs.readFileSync(localPdf);
  
  try {
    console.log("Mocking global classes...");
    if (typeof global !== "undefined") {
      if (!global.DOMMatrix) global.DOMMatrix = class {};
      if (!global.ImageData) global.ImageData = class {};
      if (!global.Path2D) global.Path2D = class {};
    }
    
    console.log("Importing pdfjs-dist...");
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    console.log("PDFJS loaded successfully.");

    console.log("Configuring workerSrc...");
    const { pathToFileURL } = require('url');
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).toString();
    console.log("workerSrc set to:", pdfjs.GlobalWorkerOptions.workerSrc);

    console.log("Running getDocument...");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
    });
    
    const doc = await loadingTask.promise;
    console.log(`Document loaded. Pages: ${doc.numPages}`);
    
    let fullText = "";
    for (let i = 1; i <= doc.numPages; i++) {
      console.log(`Reading page ${i}...`);
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    
    console.log("Extracted Text Length:", fullText.length);
    console.log("Extracted Text Sample:", fullText.substring(0, 500));
  } catch (err) {
    console.error("PDF Parsing Error:", err);
  } finally {
    try {
      fs.unlinkSync(localPdf);
    } catch (_) {}
  }
}

test();
