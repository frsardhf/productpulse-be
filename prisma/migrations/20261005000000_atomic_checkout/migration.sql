-- Preserve the name shown at purchase time instead of relying on mutable product data.
ALTER TABLE "OrderItem" ADD COLUMN "productName" TEXT;

UPDATE "OrderItem"
SET "productName" = "Product"."name"
FROM "Product"
WHERE "OrderItem"."productId" = "Product"."id";

ALTER TABLE "OrderItem" ALTER COLUMN "productName" SET NOT NULL;

-- Existing orders predate idempotent checkout, so their keys remain null.
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "Order_userId_idempotencyKey_key"
ON "Order"("userId", "idempotencyKey");
