import { ActionFunctionArgs, LoaderFunctionArgs, useSubmit, useActionData, useNavigation, useLoaderData } from "react-router";
// Removed unsupported @react-router/node exports
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  DropZone,
  Banner,
  Button,
  InlineStack,
  Thumbnail,
} from "@shopify/polaris";
import { NoteIcon } from "@shopify/polaris-icons";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";
import { MONTHLY_PLAN_BASIC, MONTHLY_PLAN_PRO } from "../lib/constants";
import { uploadEbook } from "../lib/gcs.server";
import { extractEpubMetadata } from "../lib/epub.server";
import prisma from "../db.server";
import fs from "fs";

import { checkFileLimit, getShopPlan } from "../lib/plans.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shopId = session.shop;
  
  const shopPlan = await getShopPlan(shopId);
  const fileCheck = await checkFileLimit(shopId);

  return { 
    isFreePlan: shopPlan.plan === "free", 
    fileCount: fileCheck.current, 
    canUpload: fileCheck.allowed 
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shopId = session.shop;

  // Double-check limit on server before processing file
  const fileCheck = await checkFileLimit(shopId);
  if (!fileCheck.allowed) {
    return { error: `You have reached the ${fileCheck.limit} ebook limit on your current plan. Please upgrade to upload more.` };
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file || !file.name) {
      return { error: "No file provided" };
    }

    const mimeType = file.type || "application/octet-stream";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let title = file.name;
    let coverArtUrl: string | null = null;

    // Optional EPUB metadata extraction
    if (file.name.endsWith(".epub")) {
      try {
        const metadata = await extractEpubMetadata(buffer);
        if (metadata.title) title = metadata.title;
        
        // If there's a cover image, upload it
        if (metadata.coverImageBuffer && metadata.coverImageFileName) {
          const coverFileName = `${Date.now()}-cover-${metadata.coverImageFileName}`;
          const coverUpload = await uploadEbook(
            coverFileName,
            metadata.coverImageBuffer,
            metadata.coverImageMimeType || "image/jpeg"
          );
          coverArtUrl = coverUpload.url;
        }
      } catch (err) {
        console.warn("EPUB extraction failed", err);
      }
    }

    // Upload main file to GCS
    const uniqueFileName = `${Date.now()}-${file.name}`;
    const uploadResult = await uploadEbook(uniqueFileName, buffer, mimeType);

    // Save metadata to database
    await prisma.ebookFile.create({
      data: {
        shopId,
        gcsPath: uploadResult.gcsPath,
        fileName: title,
        mimeType,
        sizeBytes: buffer.length,
        coverArtUrl,
      },
    });

    return { success: true, message: `Successfully uploaded ${title}.`, fileName: title };
  } catch (error: any) {
    console.error("Upload error:", error);
    return { error: error.message || "Failed to process upload" };
  }
}

export default function UploadEbook() {
  const submit = useSubmit();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const { isFreePlan, fileCount, canUpload } = useLoaderData<typeof loader>();

  const [file, setFile] = useState<File | null>(null);

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    },
    [],
  );

  const handleUpload = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    submit(formData, { method: "post", encType: "multipart/form-data" });
  };

  const isUploading = navigation.state === "submitting";

  return (
    <Page title="Upload Ebook">
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {isFreePlan && (
              <Banner tone={canUpload ? "info" : "critical"}>
                <p>
                  You are on the <strong>Free Tier</strong> ({fileCount}/3 ebooks uploaded). 
                  {!canUpload && " Please upgrade your plan to upload more ebooks."}
                </p>
              </Banner>
            )}

            {actionData?.error && (
              <Banner tone="critical">
                <p>{actionData.error}</p>
              </Banner>
            )}

            {actionData?.success && (
              <Banner tone="success">
                <p>{actionData.message}</p>
              </Banner>
            )}

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Select a PDF or EPUB file
                </Text>
                
                <div style={{ pointerEvents: canUpload ? "auto" : "none", opacity: canUpload ? 1 : 0.6 }}>
                  <DropZone
                    accept=".pdf, .epub, application/pdf, application/epub+zip"
                    type="file"
                    onDrop={handleDropZoneDrop}
                    allowMultiple={false}
                  >
                    {file ? (
                      <BlockStack align="center">
                        <Thumbnail size="small" alt={file.name} source={NoteIcon} />
                        <Text as="p" variant="bodyMd">{file.name}</Text>
                      </BlockStack>
                    ) : (
                      <DropZone.FileUpload />
                    )}
                  </DropZone>
                </div>

                <InlineStack>
                  <Button
                    variant="primary"
                    disabled={!file || isUploading || !canUpload}
                    loading={isUploading}
                    onClick={handleUpload}
                  >
                    Upload File
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
