-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('passenger', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'banned', 'unverified');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('local', 'google', 'firebase');

-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "password" TEXT,
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'local',
    "providerId" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'passenger',
    "status" "UserStatus" NOT NULL DEFAULT 'unverified',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "notificationPreferences" JSONB DEFAULT '{"email":{"booking":true,"payment":true,"reminder":true,"promotion":true},"sms":{"booking":true,"payment":false,"reminder":true,"promotion":false}}',

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Users_phoneNumber_key" ON "Users"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Users_verificationToken_key" ON "Users"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "Users_resetToken_key" ON "Users"("resetToken");
