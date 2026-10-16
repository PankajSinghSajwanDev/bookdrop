import { LoaderFunctionArgs, redirect } from "react-router";
import prisma from "../db.server";
import { getSignedDownloadUrl } from "../lib/gcs.server";
import { addWatermarkToPdf } from "../lib/watermark.server";
import { checkDownloadLimit, incrementDownloadCount } from "../lib/plans.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = params.token;
  
  // Get IP address from headers, handling proxy chains
  const rawIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const ipAddress = rawIp.split(',')[0].trim();
  const userAgent = request.headers.get("user-agent") || "unknown";

  if (!token) {
    return new Response("Invalid token", { status: 400 });
  }

  // 1. Fetch the delivery record with its previous attempts
  const delivery = await prisma.delivery.findUnique({
    where: { token },
    include: { 
      file: true,
      attempts: true 
    }
  });

  if (!delivery) {
    return new Response("Delivery not found", { status: 404 });
  }

  // 2. Enforce Access Rules
  if (delivery.status === "revoked") {
    return new Response("This download link has been revoked due to a refund or cancellation.", { status: 403 });
  }

  if (delivery.downloadsCount >= delivery.maxDownloads) {
    return new Response(`Download limit of ${delivery.maxDownloads} exceeded. Please contact support.`, { status: 403 });
  }

  // Check store-level monthly download limits
  const downloadCheck = await checkDownloadLimit(delivery.shopId);
  if (!downloadCheck.allowed) {
    return new Response("The store has exceeded its monthly download limit. Please contact the merchant.", { status: 403 });
  }

  // Calculate unique IPs
  const uniqueIps = new Set(
    delivery.attempts
      .map(a => a.ipAddress)
      .filter(ip => ip && ip !== "unknown" && ip !== "127.0.0.1" && ip !== "::1")
  );
  
  if (ipAddress !== "unknown" && ipAddress !== "127.0.0.1" && ipAddress !== "::1") {
    uniqueIps.add(ipAddress);
  }

  // Fraud prevention: max 3 unique IPs
  if (uniqueIps.size > 3) {
    // Log the failed attempt
    await prisma.deliveryAttempt.create({
      data: {
        deliveryId: delivery.id,
        ipAddress,
        userAgent,
        success: false
      }
    });
    return new Response("Too many devices have accessed this link. Access blocked for fraud prevention.", { status: 403 });
  }

  // 3. Log attempt and increment download count
  await prisma.$transaction([
    prisma.deliveryAttempt.create({
      data: {
        deliveryId: delivery.id,
        ipAddress,
        userAgent,
        success: true
      }
    }),
    prisma.delivery.update({
      where: { id: delivery.id },
      data: { downloadsCount: { increment: 1 } }
    })
  ]);

  // Increment store monthly usage
  await incrementDownloadCount(delivery.shopId);

  // 4. Handle PDF Watermarking vs direct EPUB/Signed URL
  if (delivery.file.mimeType === "application/pdf" || delivery.file.fileName.endsWith(".pdf")) {
    console.log(`[Download] Simulating PDF Watermark for ${delivery.orderId}`);
    try {
      // In production, fetch from GCS and watermark. 
      // For MVP, we'll generate a dummy PDF buffer here using the watermark utility to prove it works.
      const watermarkedPdfBytes = await addWatermarkToPdf(null, delivery.shopifyCustomerId || "buyer@example.com", delivery.orderId);
      
      return new Response(new Uint8Array(watermarkedPdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${delivery.file.fileName}"`,
        }
      });
    } catch (e) {
      console.error(e);
      return new Response("Error watermarking PDF", { status: 500 });
    }
  }

  // 5. For EPUBs or fallback, redirect to signed URL
  try {
    const signedUrl = await getSignedDownloadUrl(delivery.file.fileName);
    return redirect(signedUrl);
  } catch (error) {
    console.error("Failed to generate signed URL:", error);
    return new Response("Error generating download link", { status: 500 });
  }
}
