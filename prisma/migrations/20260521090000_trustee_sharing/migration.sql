-- CreateTable
CREATE TABLE "UserKeypair" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "recoveryWrappedPrivateKey" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserKeypair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserKeypairPasskeyKey" (
    "id" TEXT NOT NULL,
    "keypairId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "wrapped" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserKeypairPasskeyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultShare" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "trusteeUserId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_verify',
    "trusteePublicKey" TEXT NOT NULL,
    "trusteeFingerprint" TEXT NOT NULL,
    "sealedRootKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareAccessLog" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "trusteeUserId" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "ShareAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserKeypair_userId_key" ON "UserKeypair"("userId");

-- CreateIndex
CREATE INDEX "UserKeypairPasskeyKey_keypairId_idx" ON "UserKeypairPasskeyKey"("keypairId");

-- CreateIndex
CREATE UNIQUE INDEX "UserKeypairPasskeyKey_keypairId_credentialID_key" ON "UserKeypairPasskeyKey"("keypairId", "credentialID");

-- CreateIndex
CREATE UNIQUE INDEX "ShareInvite_token_key" ON "ShareInvite"("token");

-- CreateIndex
CREATE INDEX "ShareInvite_vaultId_idx" ON "ShareInvite"("vaultId");

-- CreateIndex
CREATE INDEX "ShareInvite_inviteeEmail_idx" ON "ShareInvite"("inviteeEmail");

-- CreateIndex
CREATE INDEX "VaultShare_vaultId_idx" ON "VaultShare"("vaultId");

-- CreateIndex
CREATE INDEX "VaultShare_trusteeUserId_idx" ON "VaultShare"("trusteeUserId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultShare_vaultId_trusteeUserId_key" ON "VaultShare"("vaultId", "trusteeUserId");

-- CreateIndex
CREATE INDEX "ShareAccessLog_shareId_idx" ON "ShareAccessLog"("shareId");

-- AddForeignKey
ALTER TABLE "UserKeypair" ADD CONSTRAINT "UserKeypair_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKeypairPasskeyKey" ADD CONSTRAINT "UserKeypairPasskeyKey_keypairId_fkey" FOREIGN KEY ("keypairId") REFERENCES "UserKeypair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareInvite" ADD CONSTRAINT "ShareInvite_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("vaultId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultShare" ADD CONSTRAINT "VaultShare_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("vaultId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultShare" ADD CONSTRAINT "VaultShare_trusteeUserId_fkey" FOREIGN KEY ("trusteeUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareAccessLog" ADD CONSTRAINT "ShareAccessLog_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "VaultShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;
