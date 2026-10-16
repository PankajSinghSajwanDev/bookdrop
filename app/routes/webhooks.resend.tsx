import { ActionFunctionArgs } from "react-router";
import prisma from "../db.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await request.json();
    
    // Resend sends webhooks like: { type: 'email.delivered', data: { id: '...' } }
    const eventType = payload.type;
    
    if (eventType && typeof eventType === "string" && eventType.startsWith("email.")) {
      console.log(`[Resend Webhook] Received ${eventType} for email ${payload.data?.id}`);
      
      // In a real scenario we'd track the Resend Email ID on the Delivery record
      // to correlate them. For MVP, we'll just return 200 OK as we are using a dummy email 
      // and our Delivery model currently tracks status by shopify events (active/revoked).
      // We could add an `emailStatus` to the Delivery model in a future DB migration.
      
      return new Response("Webhook processed", { status: 200 });
    }

    return new Response("Ignored", { status: 200 });
  } catch (error) {
    console.error("Resend webhook error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
