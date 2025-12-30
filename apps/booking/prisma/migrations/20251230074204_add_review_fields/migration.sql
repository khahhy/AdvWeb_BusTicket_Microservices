-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('visible', 'hidden', 'flagged');

-- AlterTable
ALTER TABLE "Reviews" ADD COLUMN     "flaggedReason" TEXT,
ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedBy" TEXT,
ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'visible';

-- CreateIndex
CREATE INDEX "Reviews_bookingId_idx" ON "Reviews"("bookingId");

-- CreateIndex
CREATE INDEX "Reviews_userId_idx" ON "Reviews"("userId");
