-- CreateEnum
CREATE TYPE "SettingKey" AS ENUM ('GENERAL', 'BOOKING_RULES', 'BUS_AMENITIES', 'PAYMENT_GATEWAYS', 'BUS_TYPE_PRICING', 'PRICING_POLICIES');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "BusType" AS ENUM ('standard', 'vip', 'sleeper', 'limousine');

-- CreateTable
CREATE TABLE "SystemSettings" (
    "key" "SettingKey" NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Buses" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "amenities" JSONB,
    "busType" "BusType" NOT NULL DEFAULT 'standard',
    "priceFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Buses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seats" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "seatNumber" TEXT NOT NULL,

    CONSTRAINT "Seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trips" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "tripName" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripStops" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "arrivalTime" TIMESTAMP(3),
    "departureTime" TIMESTAMP(3),

    CONSTRAINT "TripStops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripSegments" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "fromStopId" TEXT NOT NULL,
    "toStopId" TEXT NOT NULL,
    "segmentIndex" INTEGER NOT NULL,
    "durationMinutes" INTEGER,

    CONSTRAINT "TripSegments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Routes" (
    "id" TEXT NOT NULL,
    "originLocationId" TEXT NOT NULL,
    "destinationLocationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripRouteMap" (
    "tripId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "TripRouteMap_pkey" PRIMARY KEY ("tripId","routeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Buses_plate_key" ON "Buses"("plate");

-- CreateIndex
CREATE INDEX "Seats_busId_idx" ON "Seats"("busId");

-- CreateIndex
CREATE UNIQUE INDEX "Seats_busId_seatNumber_key" ON "Seats"("busId", "seatNumber");

-- CreateIndex
CREATE INDEX "Trips_busId_startTime_idx" ON "Trips"("busId", "startTime");

-- CreateIndex
CREATE INDEX "Trips_startTime_idx" ON "Trips"("startTime");

-- CreateIndex
CREATE INDEX "Trips_status_idx" ON "Trips"("status");

-- CreateIndex
CREATE INDEX "TripStops_tripId_idx" ON "TripStops"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripStops_tripId_sequence_key" ON "TripStops"("tripId", "sequence");

-- CreateIndex
CREATE INDEX "TripSegments_tripId_idx" ON "TripSegments"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripSegments_tripId_segmentIndex_key" ON "TripSegments"("tripId", "segmentIndex");

-- CreateIndex
CREATE INDEX "TripRouteMap_routeId_idx" ON "TripRouteMap"("routeId");

-- CreateIndex
CREATE INDEX "TripRouteMap_tripId_idx" ON "TripRouteMap"("tripId");

-- AddForeignKey
ALTER TABLE "Seats" ADD CONSTRAINT "Seats_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Buses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trips" ADD CONSTRAINT "Trips_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Buses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStops" ADD CONSTRAINT "TripStops_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStops" ADD CONSTRAINT "TripStops_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSegments" ADD CONSTRAINT "TripSegments_fromStopId_fkey" FOREIGN KEY ("fromStopId") REFERENCES "TripStops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSegments" ADD CONSTRAINT "TripSegments_toStopId_fkey" FOREIGN KEY ("toStopId") REFERENCES "TripStops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSegments" ADD CONSTRAINT "TripSegments_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routes" ADD CONSTRAINT "Routes_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "Locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routes" ADD CONSTRAINT "Routes_originLocationId_fkey" FOREIGN KEY ("originLocationId") REFERENCES "Locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRouteMap" ADD CONSTRAINT "TripRouteMap_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripRouteMap" ADD CONSTRAINT "TripRouteMap_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
