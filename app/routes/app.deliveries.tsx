import { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useNavigate } from "react-router";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Badge,
  Text,
  Button,
  EmptyState
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const deliveries = await prisma.delivery.findMany({
    where: { shopId: session.shop },
    include: { file: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return { deliveries };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const actionType = formData.get("actionType");
  const deliveryId = formData.get("deliveryId") as string;

  if (actionType === "revoke" && deliveryId) {
    await prisma.delivery.update({
      where: { id: deliveryId, shopId: session.shop },
      data: { status: "revoked" },
    });
    return { success: true };
  }

  return { error: "Invalid action" };
}

export default function Deliveries() {
  const { deliveries } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const handleRevoke = (id: string) => {
    fetcher.submit(
      { actionType: "revoke", deliveryId: id },
      { method: "post" }
    );
  };

  const rowMarkup = deliveries.map(
    ({ id, orderId, file, status, downloadsCount, createdAt }: any, index: number) => (
      <IndexTable.Row id={id} key={id} position={index}>
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            #{orderId}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{file?.fileName}</IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={status === "active" ? "success" : "critical"}>
            {status}
          </Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {downloadsCount} / 10
        </IndexTable.Cell>
        <IndexTable.Cell>
          {new Date(createdAt).toLocaleDateString()}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Button 
            variant="plain" 
            tone="critical" 
            onClick={() => handleRevoke(id)}
            disabled={status === "revoked" || fetcher.state !== "idle"}
          >
            Revoke
          </Button>
        </IndexTable.Cell>
      </IndexTable.Row>
    )
  );

  return (
    <Page title="Deliveries" subtitle="Track ebook delivery and download limits.">
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {deliveries.length === 0 ? (
              <EmptyState
                heading="No deliveries yet"
                action={{ content: "Upload an ebook", onAction: () => navigate("/app/upload") }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Deliveries will automatically appear here once customers purchase your linked products.</p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: 'delivery', plural: 'deliveries' }}
                itemCount={deliveries.length}
                headings={[
                  { title: 'Order' },
                  { title: 'Ebook File' },
                  { title: 'Status' },
                  { title: 'Downloads' },
                  { title: 'Date' },
                  { title: 'Actions' },
                ]}
                selectable={false}
              >
                {rowMarkup}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
