import { MigrationInterface, QueryRunner } from 'typeorm';

/** Clases prácticas mínimas sugeridas por licencia (el admin puede cambiarlas después). */
const DEFAULT_PRACTICE_BY_CODE: Record<string, number> = {
  A1: 10,
  A2: 12,
  B1: 20,
  B2: 25,
  B3: 30,
  C1: 20,
  C2: 28,
  C3: 32,
};

export class AddLicenseCategoryPracticeRequirement1747684000000 implements MigrationInterface {
  name = 'AddLicenseCategoryPracticeRequirement1747684000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "license_categories"
      ADD COLUMN "required_practice_sessions" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "license_categories"
      ADD COLUMN "requires_all_theory_topics" boolean NOT NULL DEFAULT true
    `);

    for (const [code, sessions] of Object.entries(DEFAULT_PRACTICE_BY_CODE)) {
      await queryRunner.query(
        `
        UPDATE "license_categories"
        SET "required_practice_sessions" = $1
        WHERE "code" = $2
      `,
        [sessions, code],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "license_categories" DROP COLUMN IF EXISTS "requires_all_theory_topics"
    `);
    await queryRunner.query(`
      ALTER TABLE "license_categories" DROP COLUMN IF EXISTS "required_practice_sessions"
    `);
  }
}
