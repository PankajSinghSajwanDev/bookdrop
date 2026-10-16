import prisma from "../db.server";
import { MONTHLY_PLAN_BASIC, MONTHLY_PLAN_PRO } from "./constants";

// ─── Plan Limits ───
export const PLAN_LIMITS = {
  free:  { maxFiles: 3,  maxDownloadsPerMonth: 100, watermark: false, customEmails: false, advancedAnalytics: false, fraudPrevention: false },
  basic: { maxFiles: 25, maxDownloadsPerMonth: Infinity, watermark: true, customEmails: true, advancedAnalytics: false, fraudPrevention: false },
  pro:   { maxFiles: Infinity, maxDownloadsPerMonth: Infinity, watermark: true, customEmails: true, advancedAnalytics: true, fraudPrevention: true },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

// ─── Map Shopify subscription names → local plan keys ───
export function shopifyPlanToLocal(shopifyPlanName: string): PlanName {
  if (shopifyPlanName === MONTHLY_PLAN_PRO) return "pro";
  if (shopifyPlanName === MONTHLY_PLAN_BASIC) return "basic";
  return "free";
}

// ─── Get or create a ShopPlan row ───
export async function getShopPlan(shopId: string) {
  let shopPlan = await prisma.shopPlan.findUnique({ where: { shopId } });
  if (!shopPlan) {
    shopPlan = await prisma.shopPlan.create({
      data: { shopId, plan: "free" },
    });
  }
  return shopPlan;
}

// ─── Sync plan from Shopify Billing API → local DB ───
export async function syncPlanFromBilling(shopId: string, billing: any) {
  const billingCheck = await billing.check({
    plans: [MONTHLY_PLAN_BASIC, MONTHLY_PLAN_PRO],
    isTest: true,
  });

  const subs = billingCheck.appSubscriptions || [];
  
  if (subs.length === 0) {
    // No active subscription → free plan
    return await prisma.shopPlan.upsert({
      where: { shopId },
      update: { plan: "free", shopifySubscriptionId: null, cancelledAt: null },
      create: { shopId, plan: "free" },
    });
  }

  // Take the first active subscription
  const activeSub = subs[0];
  const localPlan = shopifyPlanToLocal(activeSub.name);
  
  return await prisma.shopPlan.upsert({
    where: { shopId },
    update: {
      plan: localPlan,
      shopifySubscriptionId: activeSub.id || null,
      cancelledAt: null,
    },
    create: {
      shopId,
      plan: localPlan,
      shopifySubscriptionId: activeSub.id || null,
    },
  });
}

// ─── Get current month key (e.g. "2026-06") ───
function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// ─── Get or create MonthlyUsage row for current month ───
async function getOrCreateMonthlyUsage(shopId: string) {
  const monthKey = getCurrentMonthKey();
  
  let usage = await prisma.monthlyUsage.findUnique({
    where: { shopId_monthKey: { shopId, monthKey } },
  });

  if (!usage) {
    usage = await prisma.monthlyUsage.create({
      data: { shopId, monthKey, downloadCount: 0 },
    });
  }

  return usage;
}

// ─── Check if the store can still accept downloads this month ───
export async function checkDownloadLimit(shopId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const shopPlan = await getShopPlan(shopId);
  const limits = PLAN_LIMITS[shopPlan.plan as PlanName] || PLAN_LIMITS.free;
  
  if (limits.maxDownloadsPerMonth === Infinity) {
    return { allowed: true, current: 0, limit: Infinity };
  }

  const usage = await getOrCreateMonthlyUsage(shopId);
  return {
    allowed: usage.downloadCount < limits.maxDownloadsPerMonth,
    current: usage.downloadCount,
    limit: limits.maxDownloadsPerMonth,
  };
}

// ─── Increment download counter for this month ───
export async function incrementDownloadCount(shopId: string) {
  const monthKey = getCurrentMonthKey();

  await prisma.monthlyUsage.upsert({
    where: { shopId_monthKey: { shopId, monthKey } },
    update: { downloadCount: { increment: 1 } },
    create: { shopId, monthKey, downloadCount: 1 },
  });
}

// ─── Check if the store can upload more files ───
export async function checkFileLimit(shopId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const shopPlan = await getShopPlan(shopId);
  const limits = PLAN_LIMITS[shopPlan.plan as PlanName] || PLAN_LIMITS.free;

  if (limits.maxFiles === Infinity) {
    return { allowed: true, current: 0, limit: Infinity };
  }

  const fileCount = await prisma.ebookFile.count({ where: { shopId } });
  return {
    allowed: fileCount < limits.maxFiles,
    current: fileCount,
    limit: limits.maxFiles,
  };
}

// ─── Get full plan info for dashboard display ───
export async function getFullPlanInfo(shopId: string) {
  const shopPlan = await getShopPlan(shopId);
  const limits = PLAN_LIMITS[shopPlan.plan as PlanName] || PLAN_LIMITS.free;
  const fileCheck = await checkFileLimit(shopId);
  const downloadCheck = await checkDownloadLimit(shopId);

  return {
    plan: shopPlan.plan as PlanName,
    shopifySubscriptionId: shopPlan.shopifySubscriptionId,
    trialEndsAt: shopPlan.trialEndsAt,
    limits,
    files: fileCheck,
    downloads: downloadCheck,
  };
}
