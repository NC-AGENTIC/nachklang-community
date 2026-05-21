/*
  Warnings:

  - You are about to drop the column `wrappedRootKey` on the `Vault` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorEnabled` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `twoFactor` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "twoFactor" DROP CONSTRAINT "twoFactor_userId_fkey";

-- AlterTable
ALTER TABLE "Vault" DROP COLUMN "wrappedRootKey";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "twoFactorEnabled";

-- DropTable
DROP TABLE "twoFactor";

-- CreateTable
CREATE TABLE "VaultPasskeyKey" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "wrapped" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultPasskeyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VaultPasskeyKey_vaultId_idx" ON "VaultPasskeyKey"("vaultId");

-- CreateIndex
CREATE INDEX "VaultPasskeyKey_credentialID_idx" ON "VaultPasskeyKey"("credentialID");

-- CreateIndex
CREATE UNIQUE INDEX "VaultPasskeyKey_vaultId_credentialID_key" ON "VaultPasskeyKey"("vaultId", "credentialID");

-- AddForeignKey
ALTER TABLE "VaultPasskeyKey" ADD CONSTRAINT "VaultPasskeyKey_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("vaultId") ON DELETE CASCADE ON UPDATE CASCADE;
