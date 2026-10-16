/*
  Warnings:

  - You are about to drop the column `deliveryToken` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `downloadCount` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyOrderId` on the `Delivery` table. All the data in the column will be lost.
  - Added the required column `orderId` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - The required column `token` was added to the `Delivery` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateTable
CREATE TABLE "ShopPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "shopifySubscriptionId" TEXT,
    "trialEndsAt" DATETIME,
    "activatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MonthlyUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Delivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "shopifyCustomerId" TEXT,
    "fileId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "downloadsCount" INTEGER NOT NULL DEFAULT 0,
    "maxDownloads" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" DATETIME,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Delivery_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "EbookFile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Delivery" ("createdAt", "expiresAt", "fileId", "id", "maxDownloads", "sentAt", "shopId", "shopifyCustomerId", "status") SELECT "createdAt", "expiresAt", "fileId", "id", "maxDownloads", "sentAt", "shopId", "shopifyCustomerId", "status" FROM "Delivery";
DROP TABLE "Delivery";
ALTER TABLE "new_Delivery" RENAME TO "Delivery";
CREATE UNIQUE INDEX "Delivery_token_key" ON "Delivery"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ShopPlan_shopId_key" ON "ShopPlan"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyUsage_shopId_monthKey_key" ON "MonthlyUsage"("shopId", "monthKey");
