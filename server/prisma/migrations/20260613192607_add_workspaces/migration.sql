-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "logoPublicId" TEXT,
ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "WorkspaceMember" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
