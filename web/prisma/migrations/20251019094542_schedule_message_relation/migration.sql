-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'SCHEDULE_CANCELLED';

-- AlterTable: add message_id column to schedules
ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "message_id" INTEGER;

-- Backfill message_id using previous messages.schedule_id linkage
UPDATE "schedules" AS s
SET "message_id" = m.id
FROM "messages" AS m
WHERE m.schedule_id IS NOT NULL
  AND m.schedule_id = s.id
  AND (s.message_id IS NULL OR s.message_id <> m.id);

-- Drop previous foreign key from messages to schedules
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_schedule_id_fkey";

-- Drop obsolete column
ALTER TABLE "messages" DROP COLUMN IF EXISTS "schedule_id";

-- Add new foreign key from schedules to messages
ALTER TABLE "schedules"
  ADD CONSTRAINT "schedules_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
