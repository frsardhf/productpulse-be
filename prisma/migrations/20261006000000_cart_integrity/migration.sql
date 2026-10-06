-- Normalize invalid legacy quantities before enforcing the invariant.
UPDATE "CartItem"
SET "quantity" = 1
WHERE "quantity" < 1;

-- Preserve all legacy cart quantities while consolidating duplicate rows.
WITH consolidated AS (
    SELECT
        MIN("id") AS "keeperId",
        SUM("quantity")::INTEGER AS "totalQuantity"
    FROM "CartItem"
    GROUP BY "userId", "productId"
)
UPDATE "CartItem" AS cart
SET "quantity" = consolidated."totalQuantity"
FROM consolidated
WHERE cart."id" = consolidated."keeperId";

DELETE FROM "CartItem" AS duplicate
USING "CartItem" AS keeper
WHERE duplicate."userId" = keeper."userId"
  AND duplicate."productId" = keeper."productId"
  AND duplicate."id" > keeper."id";

CREATE UNIQUE INDEX "CartItem_userId_productId_key"
ON "CartItem"("userId", "productId");

ALTER TABLE "CartItem"
ADD CONSTRAINT "CartItem_quantity_check" CHECK ("quantity" > 0);
