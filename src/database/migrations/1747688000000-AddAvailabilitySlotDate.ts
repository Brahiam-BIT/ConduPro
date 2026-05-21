import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvailabilitySlotDate1747688000000 implements MigrationInterface {
  name = 'AddAvailabilitySlotDate1747688000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "instructor_availability_slots"
      ADD COLUMN "slot_date" date
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_instructor_availability_slot"
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_instructor_availability_slot_date"
        ON "instructor_availability_slots" ("instructor_id", "slot_date", "hour")
        WHERE "slot_date" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_instructor_availability_slot_weekly"
        ON "instructor_availability_slots" (
          "instructor_id",
          "day_of_week",
          "hour",
          "recurrence",
          COALESCE("month_week", 0)
        )
        WHERE "slot_date" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_instructor_availability_slot_weekly"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_instructor_availability_slot_date"`);
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
      ALTER TABLE "instructor_availability_slots" DROP COLUMN IF EXISTS "slot_date"
    `);
  }
}
