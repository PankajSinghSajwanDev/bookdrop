import { PDFDocument, rgb, degrees } from 'pdf-lib';

/**
 * Injects a small watermark at the bottom of every page of a PDF.
 * @param pdfBuffer The original PDF file buffer
 * @param buyerEmail The buyer's email (or dummy)
 * @param orderId The Shopify order ID
 * @returns A new watermarked PDF buffer
 */
export async function addWatermarkToPdf(
  pdfBuffer: Buffer | null,
  buyerEmail: string,
  orderId: string
): Promise<Buffer> {
  try {
    let pdfDoc: PDFDocument;
    if (pdfBuffer) {
      pdfDoc = await PDFDocument.load(pdfBuffer);
    } else {
      // Mock for MVP: generate a fresh blank PDF document
      pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      page.drawText("BookDrop Ebook Mock Content", {
        x: 150,
        y: 600,
        size: 24,
      });
    }

    const pages = pdfDoc.getPages();
    const watermarkText = `Prepared exclusively for ${buyerEmail} - Order #${orderId}`;

    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Add watermark text to the bottom center of each page
      page.drawText(watermarkText, {
        x: 50,
        y: 20,
        size: 10,
        color: rgb(0.5, 0.5, 0.5), // Gray text
        opacity: 0.7,
      });
    }

    const watermarkedBytes = await pdfDoc.save();
    return Buffer.from(watermarkedBytes);
  } catch (error) {
    console.error("Failed to watermark PDF:", error);
    // If watermarking fails, we still want to deliver the file, so return original
    return pdfBuffer || Buffer.from("PDF Generation Failed"); 
  }
}
