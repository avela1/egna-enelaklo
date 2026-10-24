-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "verified_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "ref" SET DEFAULT ('T-' || nextval('task_ref_seq'));
