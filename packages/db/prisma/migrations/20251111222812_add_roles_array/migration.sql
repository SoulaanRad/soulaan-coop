/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[walletAddress]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "role",
ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roles" TEXT[] DEFAULT ARRAY['member']::TEXT[],
ADD COLUMN     "walletAddress" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "public"."User"("walletAddress");
