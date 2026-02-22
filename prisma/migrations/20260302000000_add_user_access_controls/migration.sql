CREATE TABLE "user_access_controls" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canAccessOperations" BOOLEAN NOT NULL DEFAULT true,
    "canAccessReports" BOOLEAN NOT NULL DEFAULT true,
    "canAccessScales" BOOLEAN NOT NULL DEFAULT true,
    "canAccessSettings" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_access_controls_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_access_controls_userId_key" ON "user_access_controls"("userId");

ALTER TABLE "user_access_controls" ADD CONSTRAINT "user_access_controls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
