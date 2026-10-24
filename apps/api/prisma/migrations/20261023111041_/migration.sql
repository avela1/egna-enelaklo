-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "ref" SET DEFAULT ('T-' || nextval('task_ref_seq'));
