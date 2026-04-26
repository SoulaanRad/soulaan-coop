/*
  Warnings:

  - You are about to drop the column `email` on the `UserCoopMembership` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `UserCoopMembership` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `UserCoopMembership` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserCoopMembership" DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "phoneNumber";
