import { ActionFunctionArgs } from "react-router";
import prisma from "../db.server";
import { v4 as uuidv4 } from "uuid";
import { sendDeliveryEmail } from "../lib/email.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { shop, orderPayload } = await request.json();
  const orderId = String(orderPayload.id);

  console.log(`[Queue Worker] Processing delivery for order ${orderId} on shop ${shop}`);

  try {
    // 1. Get all line items
    const lineItems = orderPayload.line_items || [];
    if (lineItems.length === 0) return new Response("No items", { status: 200 });

    // 2. Find linked ebooks
    const productIds = lineItems.map((item: any) => String(item.product_id));
    
    const linkedFiles = await prisma.productFile.findMany({
      where: {
        shopId: shop,
        shopifyProductId: { in: productIds }
      },
      include: { file: true }
    });

    if (linkedFiles.length === 0) {
      console.log(`[Queue Worker] No ebooks found for order ${orderId}`);
      return new Response("No ebooks", { status: 200 });
    }

    // Fetch MerchantSettings for maxDownloads
    const settings = await prisma.merchantSettings.findUnique({
      where: { shopId: shop }
    });
    const maxDownloads = settings?.maxDownloads || 5;

    // 3. Create delivery records for each linked file
    for (const link of linkedFiles) {
      const lineItem = lineItems.find((item: any) => String(item.product_id) === link.shopifyProductId);
      
      const token = uuidv4();
      
      // Save delivery to DB
      await prisma.delivery.create({
        data: {
          shopId: shop,
          orderId: orderId,
          productId: link.shopifyProductId,
          fileId: link.fileId,
          token: token,
          status: "active",
          downloadsCount: 0,
          maxDownloads: maxDownloads
        }
      });

      // 4. Send the email with the download link
      const downloadUrl = `${process.env.SHOPIFY_APP_URL}/dl/${token}`;
      const customerEmail = orderPayload.email || "customer@example.com";
      const dummyEmail = "pankajsinghsajwan99@gmail.com"; // Requested dummy email
      
      await sendDeliveryEmail({
        to: dummyEmail, // using dummy email for MVP testing
        orderId: orderId,
        bookTitle: link.file.fileName,
        downloadUrl: downloadUrl
      });
      
      console.log(`[Queue Worker] Email dispatched for order ${orderId}`);
    }

    return new Response("Success", { status: 200 });
  } catch (error) {
    console.error(`[Queue Worker] Error processing order ${orderId}:`, error);
    // Return 500 so the queue can retry (if using a real queue)
    return new Response("Internal Server Error", { status: 500 });
  }
}
