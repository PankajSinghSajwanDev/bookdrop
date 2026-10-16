import { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useSubmit, useActionData, useLoaderData, useNavigation, Form } from "react-router";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  TextField,
  Button,
  InlineStack,
  Banner,
  Checkbox
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { sendDeliveryEmail } from "../lib/email.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  
  let settings = await prisma.merchantSettings.findUnique({
    where: { shopId: session.shop }
  });

  if (!settings) {
    settings = await prisma.merchantSettings.create({
      data: { shopId: session.shop }
    });
  }

  return { settings };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "testEmail") {
    const testEmail = formData.get("testEmail") as string;
    if (!testEmail) {
      return { error: "Please provide an email address." };
    }
    try {
      await sendDeliveryEmail({
        to: testEmail,
        orderId: "TEST-1001",
        bookTitle: "Sample Test Book.pdf",
        downloadUrl: `${process.env.SHOPIFY_APP_URL}/dl/test-token-123`
      });
      return { success: true, message: `Test email sent to ${testEmail}` };
    } catch (err: any) {
      return { error: err.message || "Failed to send test email." };
    }
  }

  if (actionType === "saveSettings") {
    const maxDownloads = parseInt(formData.get("maxDownloads") as string, 10);
    const watermarkEnabled = formData.get("watermarkEnabled") === "true";

    if (isNaN(maxDownloads) || maxDownloads < 1) {
      return { error: "Max downloads must be a valid number greater than 0." };
    }

    await prisma.merchantSettings.update({
      where: { shopId: session.shop },
      data: {
        maxDownloads,
        watermarkEnabled
      }
    });

    return { success: true, message: "Settings saved successfully." };
  }

  return null;
}

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  
  const [testEmail, setTestEmail] = useState("pankajsinghsajwan99@gmail.com");
  const [maxDownloads, setMaxDownloads] = useState(settings.maxDownloads.toString());
  const [watermarkEnabled, setWatermarkEnabled] = useState(settings.watermarkEnabled);

  const isSubmittingEmail = navigation.state === "submitting" && navigation.formData?.get("actionType") === "testEmail";
  const isSaving = navigation.state === "submitting" && navigation.formData?.get("actionType") === "saveSettings";

  const handleTestEmail = () => {
    submit({ actionType: "testEmail", testEmail }, { method: "post" });
  };

  const handleSaveSettings = () => {
    submit({ 
      actionType: "saveSettings", 
      maxDownloads, 
      watermarkEnabled: watermarkEnabled.toString() 
    }, { method: "post" });
  };

  return (
    <Page title="Settings">
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {actionData?.success && (
              <Banner title="Success" tone="success">
                <p>{actionData.message}</p>
              </Banner>
            )}

            {actionData?.error && (
              <Banner title="Error" tone="critical">
                <p>{actionData.error}</p>
              </Banner>
            )}

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Delivery Rules</Text>
                <Text as="p" variant="bodyMd">
                  Configure how ebooks are delivered and protected.
                </Text>
                
                <TextField
                  label="Maximum Downloads per Order"
                  value={maxDownloads}
                  onChange={setMaxDownloads}
                  type="number"
                  autoComplete="off"
                  helpText="How many times a buyer can download the file before the link expires."
                />

                <Checkbox
                  label="Enable PDF Watermarking"
                  checked={watermarkEnabled}
                  onChange={setWatermarkEnabled}
                  helpText="Automatically stamps the buyer's email onto PDF files to deter unauthorized sharing."
                />

                <InlineStack>
                  <Button variant="primary" onClick={handleSaveSettings} loading={isSaving}>
                    Save Settings
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Email Configuration</Text>
                <Text as="p" variant="bodyMd">
                  Your store is currently using the default BookDrop delivery template.
                </Text>
                
                <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                  <TextField
                    label="Test Email Address"
                    value={testEmail}
                    onChange={setTestEmail}
                    autoComplete="email"
                    type="email"
                    helpText="Send a test delivery email to preview the buyer experience."
                  />
                </div>

                <InlineStack>
                  <Button onClick={handleTestEmail} loading={isSubmittingEmail}>
                    Send Test Email
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
