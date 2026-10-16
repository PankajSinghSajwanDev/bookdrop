import { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { shopifyPlanToLocal } from "../lib/plans.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  if (topic === "APP_SUBSCRIPTIONS_UPDATE") {
    console.log(`[Webhook] Received APP_SUBSCRIPTIONS_UPDATE for ${shop}`);
    const subscription = payload.app_subscription;

    if (!subscription) {
      return new Response(null, { status: 200 });
    }

    const { status, name, admin_graphql_api_id: shopifySubscriptionId } = subscription;

    if (status === "ACTIVE") {
      const localPlan = shopifyPlanToLocal(name);
      await prisma.shopPlan.upsert({
        where: { shopId: shop },
        update: { plan: localPlan, shopifySubscriptionId, cancelledAt: null },
        create: { shopId: shop, plan: localPlan, shopifySubscriptionId }
      });
      console.log(`[Webhook] Updated ${shop} to ${localPlan} plan`);
    } else if (status === "CANCELLED" || status === "EXPIRED" || status === "DECLINED") {
      // Revert to free plan
      await prisma.shopPlan.upsert({
        where: { shopId: shop },
        update: { plan: "free", shopifySubscriptionId: null, cancelledAt: new Date() },
        create: { shopId: shop, plan: "free" }
      });
      console.log(`[Webhook] Downgraded ${shop} to free plan (status: ${status})`);
    }
  }

  return new Response(null, { status: 200 });
};
