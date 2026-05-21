import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1747682000000 implements MigrationInterface {
  name = 'CreateNotificationsTable1747682000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM (
        'SCHEDULE_CONFIRMED',
        'SCHEDULE_CANCELLED',
        'SCHEDULE_REMINDER'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "type" "notification_type_enum" NOT NULL,
        "title" character varying NOT NULL,
        "message" text NOT NULL,
        "schedule_id" uuid,
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_schedule" FOREIGN KEY ("schedule_id")
          REFERENCES "schedules"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_is_read" ON "notifications" ("is_read")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
  }
}
