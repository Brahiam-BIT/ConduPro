import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchedulingTables1747681000000 implements MigrationInterface {
  name = 'CreateSchedulingTables1747681000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "schedule_type_enum" AS ENUM ('THEORY', 'PRACTICE')
    `);
    await queryRunner.query(`
      CREATE TYPE "schedule_status_enum" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')
    `);

    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "plate" character varying NOT NULL,
        "brand" character varying NOT NULL,
        "model" character varying NOT NULL,
        "year" integer NOT NULL,
        "is_available" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_vehicles_plate" UNIQUE ("plate"),
        CONSTRAINT "PK_vehicles_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "classrooms" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "capacity" integer NOT NULL,
        "is_available" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_classrooms_name" UNIQUE ("name"),
        CONSTRAINT "PK_classrooms_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "schedules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" "schedule_type_enum" NOT NULL,
        "student_id" uuid NOT NULL,
        "instructor_id" uuid NOT NULL,
        "vehicle_id" uuid,
        "classroom_id" uuid,
        "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" "schedule_status_enum" NOT NULL DEFAULT 'PENDING',
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_schedules_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_schedules_student" FOREIGN KEY ("student_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_schedules_instructor" FOREIGN KEY ("instructor_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_schedules_vehicle" FOREIGN KEY ("vehicle_id")
          REFERENCES "vehicles"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_schedules_classroom" FOREIGN KEY ("classroom_id")
          REFERENCES "classrooms"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_schedules_start_time" ON "schedules" ("start_time")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_schedules_instructor_id" ON "schedules" ("instructor_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_schedules_student_id" ON "schedules" ("student_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_schedules_status" ON "schedules" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_schedules_vehicle_id" ON "schedules" ("vehicle_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_schedules_classroom_id" ON "schedules" ("classroom_id")
    `);

    await queryRunner.query(`
      INSERT INTO "vehicles" ("plate", "brand", "model", "year", "is_available")
      VALUES
        ('ABC-123', 'Chevrolet', 'Spark', 2022, true),
        ('XYZ-789', 'Renault', 'Logan', 2021, true)
    `);

    await queryRunner.query(`
      INSERT INTO "classrooms" ("name", "capacity", "is_available")
      VALUES
        ('Aula Teórica 1', 25, true),
        ('Aula Teórica 2', 20, true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "schedules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "classrooms"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicles"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "schedule_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "schedule_type_enum"`);
  }
}
