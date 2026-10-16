export async function enqueueDeliveryTask(shop: string, orderPayload: any) {
  // For the MVP, we use a simple local fetch to simulate the queue.
  // This allows the webhook to return 200 immediately.
  
  // In production, this would be replaced by:
  // const client = new CloudTasksClient();
  // await client.createTask({ ... });

  const url = `${process.env.SHOPIFY_APP_URL}/api/process_delivery`;
  
  // We fire and forget
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      shop,
      orderPayload,
    }),
  }).catch((err) => {
    console.error("Local queue dispatch failed:", err);
  });
}
