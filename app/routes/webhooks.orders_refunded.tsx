import { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function action({ request }: ActionFunctionArgs) {
  // 1. Authenticate and validate the webhook
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  if (topic !== "ORDERS_REFUNDED") {
    return new Response("Invalid topic", { status: 400 });
  }

  const orderId = String(payload.id);

  console.log(`[Webhook] Order ${orderId} refunded for shop ${shop}. Revoking deliveries.`);

  // 2. Revoke all active deliveries for this order
  await prisma.delivery.updateMany({
    where: {
      shopId: shop,
      orderId: orderId,
      status: "active"
    },
    data: {
      status: "revoked"
    }
  });

  // 3. Return 200 OK
  return new Response("Deliveries revoked", { status: 200 });
}
