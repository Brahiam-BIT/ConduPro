import { MigrationInterface, QueryRunner } from 'typeorm';

const CATEGORIES = [
  {
    code: 'A1',
    name: 'A1 — Motocicletas hasta 125 c.c.',
    description:
      'Habilita para conducir motocicletas con cilindrada de hasta 125 c.c.',
    group: 'A',
    groupLabel: 'Categoría A — Motocicletas',
    sortOrder: 1,
  },
  {
    code: 'A2',
    name: 'A2 — Motocicletas y motociclos > 125 c.c.',
    description:
      'Motocicletas, motociclos y mototriciclos con cilindrada superior a 125 c.c.',
    group: 'A',
    groupLabel: 'Categoría A — Motocicletas',
    sortOrder: 2,
  },
  {
    code: 'B1',
    name: 'B1 — Servicio particular liviano',
    description:
      'Automóviles, camperos, camionetas, cuatrimotos, motocarros y microbuses de servicio particular.',
    group: 'B',
    groupLabel: 'Categoría B — Servicio particular',
    sortOrder: 3,
  },
  {
    code: 'B2',
    name: 'B2 — Servicio particular pesado',
    description: 'Camiones rígidos, busetas y buses de uso privado.',
    group: 'B',
    groupLabel: 'Categoría B — Servicio particular',
    sortOrder: 4,
  },
  {
    code: 'B3',
    name: 'B3 — Articulados servicio particular',
    description: 'Vehículos articulados de servicio particular.',
    group: 'B',
    groupLabel: 'Categoría B — Servicio particular',
    sortOrder: 5,
  },
  {
    code: 'C1',
    name: 'C1 — Transporte público liviano',
    description:
      'Automóviles, camperos, camionetas y microbuses dedicados al transporte público.',
    group: 'C',
    groupLabel: 'Categoría C — Servicio público',
    sortOrder: 6,
  },
  {
    code: 'C2',
    name: 'C2 — Transporte público pesado',
    description: 'Camiones rígidos, busetas y buses de transporte público.',
    group: 'C',
    groupLabel: 'Categoría C — Servicio público',
    sortOrder: 7,
  },
  {
    code: 'C3',
    name: 'C3 — Articulados servicio público',
    description: 'Vehículos articulados de servicio público.',
    group: 'C',
    groupLabel: 'Categoría C — Servicio público',
    sortOrder: 8,
  },
] as const;

export class CreateCurriculumTables1747683000000 implements MigrationInterface {
  name = 'CreateCurriculumTables1747683000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "license_group_enum" AS ENUM ('A', 'B', 'C')
    `);

    await queryRunner.query(`
      CREATE TABLE "license_categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" character varying(8) NOT NULL,
        "name" character varying(160) NOT NULL,
        "description" text NOT NULL,
        "group" "license_group_enum" NOT NULL,
        "group_label" character varying(120) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "default_theory_capacity" integer NOT NULL DEFAULT 20,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_license_categories_code" UNIQUE ("code"),
        CONSTRAINT "PK_license_categories_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "theory_topics" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "license_category_id" uuid NOT NULL,
        "title" character varying(160) NOT NULL,
        "description" text,
        "sort_order" integer NOT NULL DEFAULT 0,
        "session_capacity" integer NOT NULL DEFAULT 20,
        "estimated_hours" numeric(5,2),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theory_topics_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_theory_topics_category" FOREIGN KEY ("license_category_id")
          REFERENCES "license_categories"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_theory_topics_category" ON "theory_topics" ("license_category_id")
    `);

    for (const cat of CATEGORIES) {
      await queryRunner.query(
        `
        INSERT INTO "license_categories" (
          "code", "name", "description", "group", "group_label", "sort_order"
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT ("code") DO NOTHING
      `,
        [cat.code, cat.name, cat.description, cat.group, cat.groupLabel, cat.sortOrder],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "theory_topics"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "license_categories"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "license_group_enum"`);
  }
}
