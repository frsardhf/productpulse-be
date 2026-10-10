ALTER TABLE "Product"
ADD COLUMN "sourceLicense" TEXT,
ADD COLUMN "sourceAttribution" TEXT,
ADD COLUMN "catalogueActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Product_catalogueActive_idx" ON "Product"("catalogueActive");
