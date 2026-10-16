import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Avatar,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { LoaderFunctionArgs, useLoaderData, useNavigate } from "react-router";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shopId = session.shop;

  // 1. Fetch products from Shopify
  const response = await admin.graphql(`
    #graphql
    query {
      products(first: 50) {
        edges {
          node {
            id
            title
            images(first: 1) {
              edges {
                node {
                  url
                }
              }
            }
          }
        }
      }
    }
  `);

  const { data } = await response.json();
  const shopifyProducts = data.products.edges.map((edge: any) => edge.node);

  // 2. Fetch our linked files
  const linkedFiles = await prisma.productFile.findMany({
    where: { shopId },
    include: { file: true },
  });

  // 3. Map linked files to products
  const productsWithFiles = shopifyProducts.map((product: any) => {
    const link = linkedFiles.find((lf: any) => lf.shopifyProductId === product.id);
    return {
      ...product,
      linkedFile: link?.file || null,
    };
  });

  return { products: productsWithFiles };
};

export default function Index() {
  const { products } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const emptyStateMarkup = (
    <EmptyState
      heading="Deliver ebooks with BookDrop"
      action={{
        content: "Upload Ebook",
        onAction: () => navigate("/app/upload"),
      }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>Upload your EPUB or PDF files, then link them to your products here.</p>
    </EmptyState>
  );

  return (
    <Page 
      title="BookDrop Dashboard" 
      primaryAction={{ content: "Upload Ebook", onAction: () => navigate("/app/upload") }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {products.length === 0 ? (
              emptyStateMarkup
            ) : (
              <ResourceList
                resourceName={{ singular: "product", plural: "products" }}
                items={products}
                renderItem={(item) => {
                  const { id, title, images, linkedFile } = item;
                  const media = (
                    <Avatar
                      customer
                      size="md"
                      name={title}
                      source={images.edges[0]?.node?.url}
                    />
                  );

                  return (
                    <ResourceItem
                      id={id}
                      url={`/app/link/${encodeURIComponent(id)}`}
                      media={media}
                      accessibilityLabel={`View details for ${title}`}
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <Text variant="bodyMd" fontWeight="bold" as="h3">
                            {title}
                          </Text>
                          {linkedFile ? (
                            <Text variant="bodySm" as="p" tone="subdued">
                              Linked: {linkedFile.fileName}
                            </Text>
                          ) : (
                            <Text variant="bodySm" as="p" tone="critical">
                              No file linked
                            </Text>
                          )}
                        </BlockStack>
                        <InlineStack gap="200" blockAlign="center">
                          {linkedFile ? (
                            <Badge tone="success">Active</Badge>
                          ) : (
                            <Button size="micro" onClick={() => navigate(`/app/link/${encodeURIComponent(id)}`)}>
                              Link File
                            </Button>
                          )}
                        </InlineStack>
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
