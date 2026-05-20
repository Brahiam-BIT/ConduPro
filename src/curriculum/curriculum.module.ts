import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CurriculumService } from './curriculum.service';
import { LicenseCategory } from './entity/license-category.entity';
import { TheoryTopic } from './entity/theory-topic.entity';
import { LicenseCategoriesController } from './license-categories.controller';
import { TheoryTopicsController } from './theory-topics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LicenseCategory, TheoryTopic])],
  controllers: [LicenseCategoriesController, TheoryTopicsController],
  providers: [CurriculumService],
  exports: [CurriculumService],
})
export class CurriculumModule {}
