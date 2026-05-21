import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTheoryTopicMaterials1747687000000 implements MigrationInterface {
  name = 'CreateTheoryTopicMaterials1747687000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "theory_topic_materials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "theory_topic_id" uuid NOT NULL,
        "instructor_id" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "original_file_name" varchar(512) NOT NULL,
        "stored_file_name" varchar(512) NOT NULL,
        "mime_type" varchar(128) NOT NULL,
        "file_size_bytes" bigint NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theory_topic_materials" PRIMARY KEY ("id"),
        CONSTRAINT "FK_material_topic" FOREIGN KEY ("theory_topic_id")
          REFERENCES "theory_topics"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_material_instructor" FOREIGN KEY ("instructor_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_theory_topic_materials_topic" ON "theory_topic_materials" ("theory_topic_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "theory_topic_materials"`);
  }
}
