-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'successful', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "GatewayType" AS ENUM ('momo', 'zalopay', 'payos', 'paypal_sandbox');

-- CreateTable
CREATE TABLE "Payments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "gateway" "GatewayType",
    "gatewayTransactionId" TEXT,
    "status" "PaymentStatus" NOT NULL,
    "metadata" JSONB,
    "orderCode" BIGINT,
    "refundedAmount" DECIMAL(65,30),
    "refundedAt" TIMESTAMP(3),
    "refundReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payments_orderCode_key" ON "Payments"("orderCode");

-- CreateIndex
CREATE INDEX "Payments_bookingId_idx" ON "Payments"("bookingId");

-- CreateIndex
CREATE INDEX "Payments_orderCode_idx" ON "Payments"("orderCode");
