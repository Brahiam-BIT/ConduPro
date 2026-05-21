import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { Repository, In } from 'typeorm';

import type { AppConfig } from '../config/configuration';
import { UserRole } from '../common/enums/user-role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { TheoryTopicMaterialResponseDto } from './dto/theory-topic-material-response.dto';
import { TheoryTopicMaterial } from './entity/theory-topic-material.entity';
import { TheoryTopic } from './entity/theory-topic.entity';
import { EnrollmentStatus } from './enums/enrollment-status.enum';
import { StudentLicenseEnrollment } from './entity/student-license-enrollment.entity';
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_BYTES = 20 * 1024 * 1024;

@Injectable()
export class TheoryTopicMaterialsService {
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(TheoryTopicMaterial)
    private readonly materialRepo: Repository<TheoryTopicMaterial>,
    @InjectRepository(TheoryTopic)
    private readonly topicRepo: Repository<TheoryTopic>,
    @InjectRepository(StudentLicenseEnrollment)
    private readonly enrollmentRepo: Repository<StudentLicenseEnrollment>,
    config: ConfigService<AppConfig, true>,
  ) {
    this.uploadDir = join(process.cwd(), 'uploads', 'theory-materials');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(
    instructorId: string,
    theoryTopicId: string,
    file: Express.Multer.File,
    title?: string,
    description?: string,
  ): Promise<TheoryTopicMaterialResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Debes adjuntar un archivo');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('El archivo no puede superar 20 MB');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Formato no permitido. Usa PDF, Word, PowerPoint o imagen (JPG/PNG).',
      );
    }

    const topic = await this.topicRepo.findOne({
      where: { id: theoryTopicId, isActive: true },
      relations: { licenseCategory: true },
    });
    if (!topic) {
      throw new NotFoundException('Tema teórico no encontrado o inactivo');
    }

    const ext = extname(file.originalname) || this.extFromMime(file.mimetype);
    const storedFileName = `${randomUUID()}${ext}`;
    const fullPath = join(this.uploadDir, storedFileName);

    const { writeFile } = await import('fs/promises');
    await writeFile(fullPath, file.buffer);

    const entity = this.materialRepo.create({
      theoryTopicId,
      instructorId,
      title: title?.trim() || file.originalname,
      description: description?.trim() || null,
      originalFileName: file.originalname,
      storedFileName,
      mimeType: file.mimetype,
      fileSizeBytes: String(file.size),
    });
    const saved = await this.materialRepo.save(entity);
    return this.toDto(await this.getMaterialOrFail(saved.id));
  }

  async listForInstructor(
    instructorId: string,
    theoryTopicId?: string,
  ): Promise<TheoryTopicMaterialResponseDto[]> {
    const rows = await this.materialRepo.find({
      where: {
        instructorId,
        ...(theoryTopicId ? { theoryTopicId } : {}),
      },
      relations: {
        theoryTopic: { licenseCategory: true },
        instructor: true,
      },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async listForStudent(studentId: string): Promise<TheoryTopicMaterialResponseDto[]> {
    const enrollments = await this.enrollmentRepo.find({
      where: {
        studentId,
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
      },
    });
    const categoryIds = [...new Set(enrollments.map((e) => e.licenseCategoryId))];
    if (categoryIds.length === 0) return [];

    const topics = await this.topicRepo.find({
      where: { licenseCategoryId: In(categoryIds), isActive: true },
    });
    const topicIds = topics.map((t) => t.id);
    if (topicIds.length === 0) return [];

    const rows = await this.materialRepo.find({
      where: { theoryTopicId: In(topicIds) },
      relations: {
        theoryTopic: { licenseCategory: true },
        instructor: true,
      },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async listByTopicForUser(
    theoryTopicId: string,
    user: JwtPayload,
  ): Promise<TheoryTopicMaterialResponseDto[]> {
    await this.assertCanAccessTopic(theoryTopicId, user);
    const rows = await this.materialRepo.find({
      where: { theoryTopicId },
      relations: {
        theoryTopic: { licenseCategory: true },
        instructor: true,
      },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async downloadFile(id: string, user: JwtPayload): Promise<StreamableFile> {
    const material = await this.getMaterialOrFail(id);
    await this.assertCanAccessTopic(material.theoryTopicId, user);

    const path = join(this.uploadDir, material.storedFileName);
    if (!existsSync(path)) {
      throw new NotFoundException('Archivo no encontrado en el servidor');
    }

    const stream = createReadStream(path);
    return new StreamableFile(stream, {
      type: material.mimeType,
      disposition: `attachment; filename="${encodeURIComponent(material.originalFileName)}"`,
    });
  }

  async remove(id: string, user: JwtPayload): Promise<void> {
    const material = await this.getMaterialOrFail(id);
    if (user.role !== UserRole.ADMIN && material.instructorId !== user.sub) {
      throw new ForbiddenException('No puedes eliminar este material');
    }

    const path = join(this.uploadDir, material.storedFileName);
    await this.materialRepo.delete(id);
    if (existsSync(path)) {
      const { unlink } = await import('fs/promises');
      await unlink(path).catch(() => undefined);
    }
  }

  private async assertCanAccessTopic(theoryTopicId: string, user: JwtPayload): Promise<void> {
    const topic = await this.topicRepo.findOne({ where: { id: theoryTopicId } });
    if (!topic) {
      throw new NotFoundException('Tema no encontrado');
    }

    if (user.role === UserRole.ADMIN || user.role === UserRole.INSTRUCTOR) {
      return;
    }

    if (user.role === UserRole.STUDENT) {
      const enrolled = await this.enrollmentRepo.findOne({
        where: {
          studentId: user.sub,
          licenseCategoryId: topic.licenseCategoryId,
          status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
        },
      });
      if (!enrolled) {
        throw new ForbiddenException('No estás matriculado en la licencia de este tema');
      }
      return;
    }

    throw new ForbiddenException('Sin permisos');
  }

  private async getMaterialOrFail(id: string): Promise<TheoryTopicMaterial> {
    const material = await this.materialRepo.findOne({
      where: { id },
      relations: {
        theoryTopic: { licenseCategory: true },
        instructor: true,
      },
    });
    if (!material) {
      throw new NotFoundException('Material no encontrado');
    }
    return material;
  }

  private toDto(row: TheoryTopicMaterial): TheoryTopicMaterialResponseDto {
    return {
      id: row.id,
      theoryTopicId: row.theoryTopicId,
      theoryTopicTitle: row.theoryTopic?.title ?? '',
      licenseCategoryId: row.theoryTopic?.licenseCategoryId ?? '',
      licenseCategoryCode: row.theoryTopic?.licenseCategory?.code ?? '',
      instructorId: row.instructorId,
      instructorName: row.instructor
        ? `${row.instructor.firstName} ${row.instructor.lastName}`.trim()
        : '',
      title: row.title,
      description: row.description,
      originalFileName: row.originalFileName,
      mimeType: row.mimeType,
      fileSizeBytes: Number(row.fileSizeBytes),
      createdAt: row.createdAt,
    };
  }

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    return map[mime] ?? '';
  }
}
