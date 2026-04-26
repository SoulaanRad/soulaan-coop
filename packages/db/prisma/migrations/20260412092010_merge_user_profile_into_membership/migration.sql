/*
  Warnings:

  - You are about to drop the `UserProfile` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[username,coopId]` on the table `UserCoopMembership` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "UserCoopMembership" ADD COLUMN     "email" TEXT,
ADD COLUMN     "lastBalanceCheck" TIMESTAMP(3),
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "lastLoginAttempt" TIMESTAMP(3),
ADD COLUMN     "loginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "sessionToken" TEXT,
ADD COLUMN     "username" TEXT;

-- DropTable
DROP TABLE "auth"."UserProfile";

-- CreateIndex
CREATE UNIQUE INDEX "UserCoopMembership_username_coopId_key" ON "UserCoopMembership"("username", "coopId");
