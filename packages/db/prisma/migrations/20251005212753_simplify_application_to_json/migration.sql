/*
  Warnings:

  - You are about to drop the column `acceptFees` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `agreeToCoopValues` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `agreeToMission` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `agreeToPrivacy` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `agreeToTerms` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `coopExperience` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `desiredService` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `identity` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyCommitment` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `motivation` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `spendingCategories` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `transparentTransactions` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `useUC` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `voteOnInvestments` on the `Application` table. All the data in the column will be lost.
  - Added the required column `data` to the `Application` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Application" DROP COLUMN "acceptFees",
DROP COLUMN "agreeToCoopValues",
DROP COLUMN "agreeToMission",
DROP COLUMN "agreeToPrivacy",
DROP COLUMN "agreeToTerms",
DROP COLUMN "coopExperience",
DROP COLUMN "desiredService",
DROP COLUMN "email",
DROP COLUMN "firstName",
DROP COLUMN "identity",
DROP COLUMN "lastName",
DROP COLUMN "monthlyCommitment",
DROP COLUMN "motivation",
DROP COLUMN "phone",
DROP COLUMN "spendingCategories",
DROP COLUMN "transparentTransactions",
DROP COLUMN "useUC",
DROP COLUMN "voteOnInvestments",
ADD COLUMN     "data" JSONB NOT NULL;
