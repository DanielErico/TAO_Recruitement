/**
 * doc-extractor-worker.js
 * 
 * Standalone Node.js script that runs word-extractor outside of Next.js/Turbopack
 * module bundling. Receives a base64-encoded buffer via stdin JSON, returns
 * extracted text via stdout JSON.
 *
 * This bypasses the Turbopack class constructor transpilation issue.
 */

process.stdin.setEncoding('utf8');

let inputData = '';
process.stdin.on('data', (chunk) => { inputData += chunk; });

process.stdin.on('end', async () => {
  try {
    const { base64 } = JSON.parse(inputData);
    const buffer = Buffer.from(base64, 'base64');

    const WordExtractor = require('word-extractor');
    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    const text = doc.getBody() ?? '';

    process.stdout.write(JSON.stringify({ success: true, text }));
  } catch (err) {
    process.stdout.write(JSON.stringify({ success: false, error: err.message }));
  }
});
