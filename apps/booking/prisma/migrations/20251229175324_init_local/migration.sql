-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pendingPayment', 'confirmed', 'cancelled');

-- CreateTable
CREATE TABLE "Bookings" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "tripId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "pickupStopId" TEXT NOT NULL,
    "dropoffStopId" TEXT NOT NULL,
    "customerInfo" JSONB NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "ticketCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatSegmentLocks" (
    "tripId" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,

    CONSTRAINT "SeatSegmentLocks_pkey" PRIMARY KEY ("tripId","seatId","segmentId")
);

-- CreateTable
CREATE TABLE "Reviews" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,

    CONSTRAINT "Reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bookings_ticketCode_key" ON "Bookings"("ticketCode");

-- CreateIndex
CREATE INDEX "Bookings_userId_idx" ON "Bookings"("userId");

-- CreateIndex
CREATE INDEX "Bookings_tripId_idx" ON "Bookings"("tripId");

-- CreateIndex
CREATE INDEX "Bookings_routeId_idx" ON "Bookings"("routeId");

-- CreateIndex
CREATE INDEX "Bookings_seatId_idx" ON "Bookings"("seatId");

-- CreateIndex
CREATE INDEX "Bookings_ticketCode_idx" ON "Bookings"("ticketCode");

-- CreateIndex
CREATE INDEX "SeatSegmentLocks_tripId_idx" ON "SeatSegmentLocks"("tripId");

-- CreateIndex
CREATE INDEX "SeatSegmentLocks_seatId_idx" ON "SeatSegmentLocks"("seatId");

-- AddForeignKey
ALTER TABLE "SeatSegmentLocks" ADD CONSTRAINT "SeatSegmentLocks_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
