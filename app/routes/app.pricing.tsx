import { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSubmit } from "react-router";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  Icon,
  Box,
  Divider,
  Banner,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { MONTHLY_PLAN_BASIC, MONTHLY_PLAN_PRO } from "../lib/constants";
import { syncPlanFromBilling } from "../lib/plans.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, billing } = await authenticate.admin(request);
  const shopId = session.shop;

  // Sync plan with Shopify Billing API and update our local database
  const shopPlan = await syncPlanFromBilling(shopId, billing);

  let activePlan = "Free Plan";
  if (shopPlan.plan === "basic") activePlan = MONTHLY_PLAN_BASIC;
  if (shopPlan.plan === "pro") activePlan = MONTHLY_PLAN_PRO;

  return { activePlan };
}

export async function action({ request }: ActionFunctionArgs) {
  const { billing } = await authenticate.admin(request);
  const formData = await request.clone().formData();
  const plan = formData.get("plan") as string;

  if (plan === MONTHLY_PLAN_BASIC || plan === MONTHLY_PLAN_PRO) {
    // billing.request() always throws a redirect on success.
    // Let the SDK auto-generate the correct returnUrl.
    await billing.request({
      plan: plan,
      isTest: true,
    });
  }

  return null;
}

/* ─── Tiny helper component for feature rows ─── */
function FeatureRow({ children }: { children: React.ReactNode }) {
  return (
    <InlineStack gap="200" blockAlign="center" wrap={false}>
      <Box>
        <Icon source={CheckIcon} tone="success" />
      </Box>
      <Text as="span" variant="bodyMd">{children}</Text>
    </InlineStack>
  );
}

export default function PricingPage() {
  const { activePlan } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const handleSubscribe = (plan: string) => {
    submit({ plan }, { method: "post" });
  };

  const isActive = (plan: string) => activePlan === plan;

  return (
    <Page title="Plans & Pricing">
      <BlockStack gap="600">

        {/* Current plan banner */}
        <Banner tone="info">
          <p>
            You are currently on the <strong>{activePlan}</strong>.
            {activePlan === "Free Plan" && " Upgrade to unlock unlimited ebooks, watermarking, analytics, and more."}
          </p>
        </Banner>

        <Layout>
          {/* ───────── FREE TIER ───────── */}
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                {/* Header */}
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingLg" fontWeight="bold">Free</Text>
                    {isActive("Free Plan") && <Badge tone="success">Active</Badge>}
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Perfect for trying things out
                  </Text>
                </BlockStack>

                {/* Price */}
                <BlockStack gap="100">
                  <InlineStack gap="100" blockAlign="baseline">
                    <Text as="span" variant="heading2xl" fontWeight="bold">$0</Text>
                    <Text as="span" variant="bodySm" tone="subdued">/month</Text>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">Free forever — no credit card</Text>
                </BlockStack>

                <Divider />

                {/* Features */}
                <BlockStack gap="300">
                  <Text as="p" variant="headingSm" fontWeight="semibold">Includes:</Text>
                  <FeatureRow>Up to 3 ebook files</FeatureRow>
                  <FeatureRow>Standard delivery emails</FeatureRow>
                  <FeatureRow>100 downloads / month</FeatureRow>
                  <FeatureRow>Basic analytics</FeatureRow>
                </BlockStack>

                <Divider />

                {/* CTA */}
                {isActive("Free Plan") ? (
                  <Button disabled fullWidth>Current Plan</Button>
                ) : (
                  <Button disabled fullWidth>Downgrade</Button>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* ───────── BASIC PLAN ───────── */}
          <Layout.Section variant="oneThird">
            <Card background="bg-surface-secondary">
              <BlockStack gap="400">
                {/* Header */}
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingLg" fontWeight="bold">Basic</Text>
                    <InlineStack gap="200">
                      {isActive(MONTHLY_PLAN_BASIC) ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="attention">Popular</Badge>
                      )}
                    </InlineStack>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    For growing authors & creators
                  </Text>
                </BlockStack>

                {/* Price */}
                <BlockStack gap="100">
                  <InlineStack gap="100" blockAlign="baseline">
                    <Text as="span" variant="heading2xl" fontWeight="bold">$12</Text>
                    <Text as="span" variant="bodySm" tone="subdued">/month</Text>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">14-day free trial included</Text>
                </BlockStack>

                <Divider />

                {/* Features */}
                <BlockStack gap="300">
                  <Text as="p" variant="headingSm" fontWeight="semibold">Everything in Free, plus:</Text>
                  <FeatureRow>Up to 25 ebook files</FeatureRow>
                  <FeatureRow>PDF watermarking</FeatureRow>
                  <FeatureRow>Unlimited downloads</FeatureRow>
                  <FeatureRow>Custom delivery emails</FeatureRow>
                  <FeatureRow>Delivery analytics</FeatureRow>
                  <FeatureRow>Email support</FeatureRow>
                </BlockStack>

                <Divider />

                {/* CTA */}
                {isActive(MONTHLY_PLAN_BASIC) ? (
                  <Button disabled fullWidth>Current Plan</Button>
                ) : (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => handleSubscribe(MONTHLY_PLAN_BASIC)}
                  >
                    Start 14-Day Free Trial
                  </Button>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* ───────── PRO PLAN ───────── */}
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                {/* Header */}
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingLg" fontWeight="bold">Pro</Text>
                    {isActive(MONTHLY_PLAN_PRO) && <Badge tone="success">Active</Badge>}
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    For serious publishers & studios
                  </Text>
                </BlockStack>

                {/* Price */}
                <BlockStack gap="100">
                  <InlineStack gap="100" blockAlign="baseline">
                    <Text as="span" variant="heading2xl" fontWeight="bold">$25</Text>
                    <Text as="span" variant="bodySm" tone="subdued">/month</Text>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">14-day free trial included</Text>
                </BlockStack>

                <Divider />

                {/* Features */}
                <BlockStack gap="300">
                  <Text as="p" variant="headingSm" fontWeight="semibold">Everything in Basic, plus:</Text>
                  <FeatureRow>Unlimited ebook files</FeatureRow>
                  <FeatureRow>Advanced analytics dashboard</FeatureRow>
                  <FeatureRow>Priority email support</FeatureRow>
                  <FeatureRow>Custom branding on emails</FeatureRow>
                  <FeatureRow>Fraud prevention tools</FeatureRow>
                  <FeatureRow>Multi-language support</FeatureRow>
                </BlockStack>

                <Divider />

                {/* CTA */}
                {isActive(MONTHLY_PLAN_PRO) ? (
                  <Button disabled fullWidth>Current Plan</Button>
                ) : (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => handleSubscribe(MONTHLY_PLAN_PRO)}
                  >
                    Start 14-Day Free Trial
                  </Button>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* FAQ / Trust section */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd" fontWeight="bold">Frequently Asked Questions</Text>
                <Divider />
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" fontWeight="semibold">Can I cancel anytime?</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Yes! All plans are billed through Shopify. You can cancel or change your plan at any time from this page or your Shopify admin. No hidden fees.
                  </Text>
                </BlockStack>
                <Divider />
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" fontWeight="semibold">What happens after my free trial?</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    After 14 days, your selected plan will be billed automatically through your Shopify account. You can downgrade to the Free Tier before the trial ends to avoid charges.
                  </Text>
                </BlockStack>
                <Divider />
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" fontWeight="semibold">Do I need a credit card for the free trial?</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Since billing is handled by Shopify, your existing Shopify payment method will be used. You won't be charged during the 14-day trial period.
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

      </BlockStack>
    </Page>
  );
}
