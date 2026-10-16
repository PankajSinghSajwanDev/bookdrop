import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "react-router";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Select,
  Button,
  InlineStack,
  Banner,
} from "@shopify/polaris";
import { useState } from "react";
import { useLoaderData, useSubmit, useNavigation, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const shopId = session.shop;
  const productId = params.id as string;

  // 1. Fetch Product details from Shopify
  const response = await admin.graphql(`
    #graphql
    query GetProduct($id: ID!) {
      product(id: $id) {
        id
        title
      }
    }
  `, {
    variables: { id: productId }
  });

  const { data } = await response.json();
  const product = data.product;

  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }

  // 2. Fetch all uploaded files for this shop
  const files = await prisma.ebookFile.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
  });

  // 3. Check if there's an existing link
  const existingLink = await prisma.productFile.findFirst({
    where: { shopId, shopifyProductId: productId },
    include: { file: true },
  });

  return { product, files, existingLink };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shopId = session.shop;
  const productId = params.id as string;

  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "unlink") {
    await prisma.productFile.deleteMany({
      where: { shopId, shopifyProductId: productId },
    });
    return { success: true };
  }

  const fileId = formData.get("fileId") as string;
  if (!fileId) return { error: "No file selected" };

  // Upsert the link
  const existing = await prisma.productFile.findFirst({
    where: { shopId, shopifyProductId: productId }
  });

  if (existing) {
    await prisma.productFile.update({
      where: { id: existing.id },
      data: { fileId },
    });
  } else {
    await prisma.productFile.create({
      data: {
        shopId,
        shopifyProductId: productId,
        fileId,
      },
    });
  }

  return redirect("/app");
}

export default function LinkRoute() {
  const { product, files, existingLink } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<string>(existingLink?.fileId || "");
  const isSubmitting = navigation.state === "submitting";

  const options = [
    { label: "Select an ebook file...", value: "" },
    ...files.map((f: any) => ({ label: f.fileName, value: f.id }))
  ];

  const handleSave = () => {
    submit({ fileId: selectedFile, actionType: "link" }, { method: "post" });
  };

  const handleUnlink = () => {
    submit({ actionType: "unlink" }, { method: "post" });
    setSelectedFile("");
  };

  return (
    <Page 
      title={`Link Ebook to ${product.title}`}
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {files.length === 0 && (
              <Banner title="No files uploaded" tone="warning">
                <p>You haven't uploaded any ebooks yet. Please upload a file first.</p>
              </Banner>
            )}

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Select File</Text>
                
                <Select
                  label="Ebook File"
                  options={options}
                  onChange={setSelectedFile}
                  value={selectedFile}
                  disabled={files.length === 0}
                />

                <InlineStack gap="300">
                  <Button 
                    variant="primary" 
                    onClick={handleSave} 
                    loading={isSubmitting}
                    disabled={!selectedFile || files.length === 0}
                  >
                    {existingLink ? "Update Link" : "Save Link"}
                  </Button>

                  {existingLink && (
                    <Button 
                      tone="critical" 
                      onClick={handleUnlink}
                      disabled={isSubmitting}
                    >
                      Remove Link
                    </Button>
                  )}
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
