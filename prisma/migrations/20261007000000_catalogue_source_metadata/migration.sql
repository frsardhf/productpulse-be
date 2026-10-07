CREATE TYPE "ImageRightsStatus" AS ENUM (
    'UNVERIFIED',
    'PERMITTED',
    'PLACEHOLDER_ONLY'
);

ALTER TABLE "Product"
ADD COLUMN "sourceProvider" TEXT,
ADD COLUMN "sourceProductId" TEXT,
ADD COLUMN "sourceVariantId" TEXT,
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "sourceTitle" TEXT,
ADD COLUMN "sourceVendor" TEXT,
ADD COLUMN "sourceCategory" TEXT,
ADD COLUMN "sourceProductType" TEXT,
ADD COLUMN "sourceSku" TEXT,
ADD COLUMN "variantLabel" TEXT,
ADD COLUMN "sourcePrice" DECIMAL(65,30),
ADD COLUMN "sourceCurrency" TEXT,
ADD COLUMN "sourceAvailable" BOOLEAN,
ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3),
ADD COLUMN "sourceImportedAt" TIMESTAMP(3),
ADD COLUMN "catalogueFixture" TEXT,
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "imageAlt" TEXT,
ADD COLUMN "imageWidth" INTEGER,
ADD COLUMN "imageHeight" INTEGER,
ADD COLUMN "imageRightsStatus" "ImageRightsStatus" NOT NULL DEFAULT 'PLACEHOLDER_ONLY';

-- Reuse the lowest category ID for duplicate legacy names so product and order
-- references remain stable before category names become unique.
WITH category_aliases AS (
    SELECT
        "id",
        MIN("id") OVER (PARTITION BY "name") AS "keeperId"
    FROM "Category"
)
UPDATE "Product" AS product
SET "categoryId" = aliases."keeperId"
FROM category_aliases AS aliases
WHERE product."categoryId" = aliases."id"
  AND aliases."id" <> aliases."keeperId";

DELETE FROM "Category" AS duplicate
USING "Category" AS keeper
WHERE duplicate."name" = keeper."name"
  AND duplicate."id" > keeper."id";

CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

CREATE UNIQUE INDEX "Product_sourceProvider_sourceVariantId_key"
ON "Product"("sourceProvider", "sourceVariantId");
