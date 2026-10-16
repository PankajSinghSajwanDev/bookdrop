import { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { enqueueDeliveryTask } from "../lib/queue.server";

export async function action({ request }: ActionFunctionArgs) {
  // 1. Authenticate and validate the webhook payload using Shopify's HMAC
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  if (topic !== "ORDERS_PAID") {
    return new Response("Invalid topic", { status: 400 });
  }

  // 2. Immediately enqueue the payload for processing
  // This allows us to return a 200 OK instantly so Shopify doesn't timeout
  await enqueueDeliveryTask(shop, payload);

  // 3. Return 200 OK
  return new Response("Webhook received and queued", { status: 200 });
}
