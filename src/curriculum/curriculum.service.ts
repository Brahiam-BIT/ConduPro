import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LicenseCategory } from './entity/license-category.entity';
import { TheoryTopic } from './entity/theory-topic.entity';
import { LicenseCategoryResponseDto } from './dto/license-category-response.dto';
import { UpdateLicenseCategoryDto } from './dto/update-license-category.dto';
import {
  CreateTheoryTopicDto,
  UpdateTheoryTopicDto,
} from './dto/theory-topic-payload.dto';
import { TheoryTopicResponseDto } from './dto/theory-topic-response.dto';

@Injectable()
export class CurriculumService {
  constructor(
    @InjectRepository(LicenseCategory)
    private readonly categoryRepo: Repository<LicenseCategory>,
    @InjectRepository(TheoryTopic)
    private readonly topicRepo: Repository<TheoryTopic>,
  ) {}

  async findAllCategories(): Promise<LicenseCategoryResponseDto[]> {
    const categories = await this.categoryRepo.find({
      order: { group: 'ASC', sortOrder: 'ASC', code: 'ASC' },
      relations: { theoryTopics: true },
    });
    return categories.map((c) => this.toCategoryDto(c));
  }

  async findCategory(id: string): Promise<LicenseCategoryResponseDto> {
    const category = await this.getCategoryOrFail(id);
    return this.toCategoryDto(category);
  }

  async updateCategory(
    id: string,
    dto: UpdateLicenseCategoryDto,
  ): Promise<LicenseCategoryResponseDto> {
    const category = await this.getCategoryOrFail(id);
    if (dto.name !== undefined) category.name = dto.name;
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.defaultTheoryCapacity !== undefined) {
      category.defaultTheoryCapacity = dto.defaultTheoryCapacity;
    }
    if (dto.isActive !== undefined) category.isActive = dto.isActive;
    const saved = await this.categoryRepo.save(category);
    const withTopics = await this.getCategoryOrFail(saved.id);
    return this.toCategoryDto(withTopics);
  }

  async findTopicsByCategory(licenseCategoryId: string): Promise<TheoryTopicResponseDto[]> {
    await this.getCategoryOrFail(licenseCategoryId);
    const topics = await this.topicRepo.find({
      where: { licenseCategoryId },
      order: { sortOrder: 'ASC', title: 'ASC' },
    });
    return topics.map((t) => this.toTopicDto(t));
  }

  async createTopic(dto: CreateTheoryTopicDto): Promise<TheoryTopicResponseDto> {
    const category = await this.getCategoryOrFail(dto.licenseCategoryId);
    const topic = this.topicRepo.create({
      licenseCategoryId: dto.licenseCategoryId,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? null,
      sortOrder: dto.sortOrder ?? 0,
      sessionCapacity: dto.sessionCapacity ?? category.defaultTheoryCapacity,
      estimatedHours:
        dto.estimatedHours !== undefined ? String(dto.estimatedHours) : null,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.topicRepo.save(topic);
    return this.toTopicDto(saved);
  }

  async updateTopic(id: string, dto: UpdateTheoryTopicDto): Promise<TheoryTopicResponseDto> {
    const topic = await this.getTopicOrFail(id);
    if (dto.licenseCategoryId !== undefined) {
      await this.getCategoryOrFail(dto.licenseCategoryId);
      topic.licenseCategoryId = dto.licenseCategoryId;
    }
    if (dto.title !== undefined) topic.title = dto.title.trim();
    if (dto.description !== undefined) topic.description = dto.description?.trim() ?? null;
    if (dto.sortOrder !== undefined) topic.sortOrder = dto.sortOrder;
    if (dto.sessionCapacity !== undefined) topic.sessionCapacity = dto.sessionCapacity;
    if (dto.estimatedHours !== undefined) {
      topic.estimatedHours =
        dto.estimatedHours === null ? null : String(dto.estimatedHours);
    }
    if (dto.isActive !== undefined) topic.isActive = dto.isActive;
    const saved = await this.topicRepo.save(topic);
    return this.toTopicDto(saved);
  }

  async removeTopic(id: string): Promise<void> {
    const topic = await this.getTopicOrFail(id);
    await this.topicRepo.remove(topic);
  }

  private async getCategoryOrFail(id: string): Promise<LicenseCategory> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: { theoryTopics: true },
    });
    if (!category) {
      throw new NotFoundException('Categoría de licencia no encontrada');
    }
    return category;
  }

  private async getTopicOrFail(id: string): Promise<TheoryTopic> {
    const topic = await this.topicRepo.findOne({ where: { id } });
    if (!topic) {
      throw new NotFoundException('Tema teórico no encontrado');
    }
    return topic;
  }

  private toCategoryDto(category: LicenseCategory): LicenseCategoryResponseDto {
    const topicCount = (category.theoryTopics ?? []).filter((t) => t.isActive).length;
    return {
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description,
      group: category.group,
      groupLabel: category.groupLabel,
      sortOrder: category.sortOrder,
      defaultTheoryCapacity: category.defaultTheoryCapacity,
      isActive: category.isActive,
      topicCount,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private toTopicDto(topic: TheoryTopic): TheoryTopicResponseDto {
    return {
      id: topic.id,
      licenseCategoryId: topic.licenseCategoryId,
      title: topic.title,
      description: topic.description,
      sortOrder: topic.sortOrder,
      sessionCapacity: topic.sessionCapacity,
      estimatedHours:
        topic.estimatedHours !== null ? Number(topic.estimatedHours) : null,
      isActive: topic.isActive,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
    };
  }
}
