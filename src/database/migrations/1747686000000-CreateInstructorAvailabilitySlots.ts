import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInstructorAvailabilitySlots1747686000000 implements MigrationInterface {
  name = 'CreateInstructorAvailabilitySlots1747686000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "availability_class_type_enum" AS ENUM ('THEORY', 'PRACTICE')
    `);
    await queryRunner.query(`
      CREATE TYPE "availability_recurrence_enum" AS ENUM ('WEEKLY', 'MONTHLY_NTH', 'YEARLY')
    `);
    await queryRunner.query(`
      CREATE TABLE "instructor_availability_slots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "instructor_id" uuid NOT NULL,
        "day_of_week" smallint NOT NULL,
        "hour" smallint NOT NULL,
        "available" boolean NOT NULL DEFAULT true,
        "class_type" "availability_class_type_enum" NOT NULL DEFAULT 'PRACTICE',
        "theory_topic_id" uuid,
        "license_category_id" uuid,
        "recurrence" "availability_recurrence_enum" NOT NULL DEFAULT 'WEEKLY',
        "month_week" smallint,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_instructor_availability_slots" PRIMARY KEY ("id"),
        CONSTRAINT "FK_availability_instructor" FOREIGN KEY ("instructor_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_availability_theory_topic" FOREIGN KEY ("theory_topic_id")
          REFERENCES "theory_topics"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_availability_license_category" FOREIGN KEY ("license_category_id")
          REFERENCES "license_categories"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_availability_day_of_week" CHECK ("day_of_week" BETWEEN 1 AND 5),
        CONSTRAINT "CHK_availability_hour" CHECK ("hour" BETWEEN 0 AND 23),
        CONSTRAINT "CHK_availability_month_week" CHECK ("month_week" IS NULL OR ("month_week" BETWEEN 1 AND 4))
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_instructor_availability_slot"
        ON "instructor_availability_slots" (
          "instructor_id",
          "day_of_week",
          "hour",
          "recurrence",
          COALESCE("month_week", 0)
        )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_availability_instructor" ON "instructor_availability_slots" ("instructor_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "instructor_availability_slots"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "availability_recurrence_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "availability_class_type_enum"`);
  }
}
