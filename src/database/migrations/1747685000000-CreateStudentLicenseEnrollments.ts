import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentLicenseEnrollments1747685000000 implements MigrationInterface {
  name = 'CreateStudentLicenseEnrollments1747685000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "enrollment_status_enum" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED')
    `);

    await queryRunner.query(`
      CREATE TABLE "student_license_enrollments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL,
        "license_category_id" uuid NOT NULL,
        "status" "enrollment_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "enrolled_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_license_enrollments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_enrollment_student" FOREIGN KEY ("student_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_enrollment_category" FOREIGN KEY ("license_category_id")
          REFERENCES "license_categories"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_enrollment_student_category_active"
      ON "student_license_enrollments" ("student_id", "license_category_id")
      WHERE "status" = 'ACTIVE'
    `);

    await queryRunner.query(`
      CREATE TABLE "student_theory_topic_progress" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "enrollment_id" uuid NOT NULL,
        "theory_topic_id" uuid NOT NULL,
        "schedule_id" uuid,
        "completed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_theory_topic_progress" PRIMARY KEY ("id"),
        CONSTRAINT "FK_progress_enrollment" FOREIGN KEY ("enrollment_id")
          REFERENCES "student_license_enrollments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_progress_topic" FOREIGN KEY ("theory_topic_id")
          REFERENCES "theory_topics"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_progress_schedule" FOREIGN KEY ("schedule_id")
          REFERENCES "schedules"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_progress_enrollment_topic" UNIQUE ("enrollment_id", "theory_topic_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "schedules"
      ADD COLUMN "license_category_id" uuid,
      ADD COLUMN "theory_topic_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "schedules"
      ADD CONSTRAINT "FK_schedules_license_category"
        FOREIGN KEY ("license_category_id") REFERENCES "license_categories"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "schedules"
      ADD CONSTRAINT "FK_schedules_theory_topic"
        FOREIGN KEY ("theory_topic_id") REFERENCES "theory_topics"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_schedules_license_category" ON "schedules" ("license_category_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "schedules" DROP CONSTRAINT IF EXISTS "FK_schedules_theory_topic"`);
    await queryRunner.query(`ALTER TABLE "schedules" DROP CONSTRAINT IF EXISTS "FK_schedules_license_category"`);
    await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN IF EXISTS "theory_topic_id"`);
    await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN IF EXISTS "license_category_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_theory_topic_progress"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_license_enrollments"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "enrollment_status_enum"`);
  }
}
