import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AvailabilityClassType } from '../enums/availability-class-type.enum';
import { InstructorAvailabilitySlot } from '../entity/instructor-availability-slot.entity';
import { UserAvailabilitySlotDto } from '../dto/set-availability.dto';

@Injectable()
export class InstructorAvailabilityRepository {
  constructor(
    @InjectRepository(InstructorAvailabilitySlot)
    private readonly repository: Repository<InstructorAvailabilitySlot>,
  ) {}

  async findByInstructor(instructorId: string): Promise<InstructorAvailabilitySlot[]> {
    return this.repository.find({
      where: { instructorId },
      relations: { theoryTopic: true, licenseCategory: true },
      order: { dayOfWeek: 'ASC', hour: 'ASC' },
    });
  }

  async replaceForInstructor(
    instructorId: string,
    slots: UserAvailabilitySlotDto[],
  ): Promise<InstructorAvailabilitySlot[]> {
    await this.repository.delete({ instructorId });

    if (slots.length === 0) return [];

    const entities = slots.map((slot) =>
      this.repository.create({
        instructorId,
        dayOfWeek: slot.dayOfWeek,
        slotDate: slot.slotDate ?? null,
        hour: slot.hour,
        available: slot.available,
        classType: slot.classType,
        theoryTopicId:
          slot.classType === AvailabilityClassType.THEORY ? (slot.theoryTopicId ?? null) : null,
        licenseCategoryId: slot.licenseCategoryId ?? null,
        recurrence: slot.recurrence,
        monthWeek: slot.monthWeek ?? null,
      }),
    );

    return this.repository.save(entities);
  }
}
