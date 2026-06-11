import Tesseract from 'tesseract.js';
import { extractReceiptFields } from '../utils/receiptExtractor';

let worker = null;

// ---------------------------------------------------------------------------
// Image resize helper
// ---------------------------------------------------------------------------
const resizeImageForOcr = (file, maxWidth = 1400, quality = 0.9) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const imageUrl = URL.createObjectURL(file);

    img.onload = () => {
      const scale = Math.min(maxWidth / img.width, 1);

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        blob => {
          URL.revokeObjectURL(imageUrl);
          if (!blob) {
            reject(new Error('Image compression failed'));
            return;
          }
          const resizedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '') + '-ocr.jpg',
            { type: 'image/jpeg', lastModified: Date.now() }
          );
          resolve(resizedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Failed to load image for OCR resizing'));
    };

    img.src = imageUrl;
  });
};

// ---------------------------------------------------------------------------
// FIX 1: PDF → image conversion using pdfjs-dist
// Converts the first page of a PDF to a JPEG Blob for Tesseract.
// Install: npm install pdfjs-dist
// ---------------------------------------------------------------------------
const convertPdfToImage = async (file) => {
  // Dynamic import so the large pdfjs bundle is only loaded when needed
  const pdfjsLib = await import('pdfjs-dist');

  // Point the worker at the bundled worker file.
  // If you use Vite/CRA you can import the URL instead:
  //   import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
  //   pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Only OCR the first page (receipts are typically one page)
  const page = await pdf.getPage(1);

  // Render at 2× scale so text is readable by Tesseract
  const scale = 2.0;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) { reject(new Error('PDF-to-image conversion failed')); return; }
        const imageFile = new File(
          [blob],
          file.name.replace(/\.pdf$/i, '') + '-ocr.jpg',
          { type: 'image/jpeg', lastModified: Date.now() }
        );
        resolve(imageFile);
      },
      'image/jpeg',
      0.92
    );
  });
};

// ---------------------------------------------------------------------------
// Tesseract worker — lazy singleton
// FIX 5: expose terminate() so callers can clean up on unmount
// ---------------------------------------------------------------------------
const getWorker = async () => {
  if (!worker) {
    worker = await Tesseract.createWorker('eng');
  }
  return worker;
};

export const terminateOcrWorker = async () => {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
};

// ---------------------------------------------------------------------------
// Main entry point called by LiquidationForm → handleRowFileChange
// ---------------------------------------------------------------------------
export const scanReceipt = async (file) => {
  let fileToScan = file;

  // FIX 1: Handle PDFs by converting to image first
  if (file.type === 'application/pdf') {
    fileToScan = await convertPdfToImage(file);
  }

  // Resize/compress images before OCR
  const optimizedFile = await resizeImageForOcr(fileToScan, 1400, 0.9);

  const ocrWorker = await getWorker();
  const { data: { text } } = await ocrWorker.recognize(optimizedFile);

  const extracted = extractReceiptFields(text);

  return { rawText: text, extracted };
};