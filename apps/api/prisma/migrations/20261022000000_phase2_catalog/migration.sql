-- The human reference of a task, for example T-1001.
CREATE SEQUENCE "task_ref_seq" START 1001;

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('LIVE', 'DRAFT', 'DISABLED');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'LIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubCity" AS ENUM ('ADDIS_KETEMA', 'AKAKY_KALITI', 'ARADA', 'BOLE', 'GULLELE', 'KIRKOS', 'KOLFE_KERANIO', 'LEMI_KURA', 'LIDETA', 'NIFAS_SILK_LAFTO', 'YEKA');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO', 'QUOTED', 'APPROVED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'EXCEPTION', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('AUTHORIZATION_LETTER', 'REFERENCE_PHOTO', 'OTHER');

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "icon" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'DRAFT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_templates" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "definition" JSONB NOT NULL,
    "published_at" TIMESTAMP(3),
    "published_by" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "sub_city" "SubCity" NOT NULL,
    "woreda" TEXT,
    "landmark" TEXT NOT NULL,
    "directions" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "ref" TEXT NOT NULL DEFAULT ('T-' || nextval('task_ref_seq')),
    "customer_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "budget_cap_santim" INTEGER,
    "deadline_at" TIMESTAMP(3),
    "pickup_address_id" UUID,
    "delivery_address_id" UUID,
    "sub_city" "SubCity",
    "submitted_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_status_history" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "from_status" "TaskStatus" NOT NULL,
    "to_status" "TaskStatus" NOT NULL,
    "actor_id" UUID,
    "actor_role" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "task_id" UUID,
    "kind" "AttachmentKind" NOT NULL DEFAULT 'OTHER',
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prohibited_items" (
    "id" UUID NOT NULL,
    "term" TEXT NOT NULL,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prohibited_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_key_key" ON "services"("key");

-- CreateIndex
CREATE INDEX "services_status_idx" ON "services"("status");

-- CreateIndex
CREATE INDEX "service_templates_status_idx" ON "service_templates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "service_templates_service_id_version_key" ON "service_templates"("service_id", "version");

-- CreateIndex
CREATE INDEX "addresses_user_id_deleted_at_idx" ON "addresses"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "tasks_customer_id_status_idx" ON "tasks"("customer_id", "status");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_service_id_idx" ON "tasks"("service_id");

-- CreateIndex
CREATE INDEX "task_status_history_task_id_created_at_idx" ON "task_status_history"("task_id", "created_at");

-- CreateIndex
CREATE INDEX "attachments_owner_id_idx" ON "attachments"("owner_id");

-- CreateIndex
CREATE INDEX "attachments_task_id_idx" ON "attachments"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "prohibited_items_term_key" ON "prohibited_items"("term");

-- CreateIndex
CREATE INDEX "prohibited_items_active_idx" ON "prohibited_items"("active");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- AddForeignKey
ALTER TABLE "service_templates" ADD CONSTRAINT "service_templates_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "service_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_status_history" ADD CONSTRAINT "task_status_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A service has at most one LIVE template. Prisma cannot express a partial
-- index, so it lives here.
CREATE UNIQUE INDEX "service_templates_one_live_per_service"
    ON "service_templates" ("service_id")
    WHERE "status" = 'LIVE';

-- The status history is append only, the same way the audit log is.
CREATE OR REPLACE FUNCTION task_status_history_block_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'task_status_history is append-only: % is not allowed', TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_status_history_block_update
    BEFORE UPDATE ON "task_status_history"
    FOR EACH ROW EXECUTE FUNCTION task_status_history_block_mutation();

CREATE TRIGGER task_status_history_block_delete
    BEFORE DELETE ON "task_status_history"
    FOR EACH ROW EXECUTE FUNCTION task_status_history_block_mutation();

