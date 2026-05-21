import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ApiStandardResponses } from '../common/decorators/api-standard-responses.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { CreateEnrollmentDto, CreateMyEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentProgressDto } from './dto/enrollment-progress.dto';
import { StudentEnrollmentService } from './student-enrollment.service';

@ApiTags('enrollments')
@ApiBearerAuth('access-token')
@Controller({ path: 'student-enrollments', version: '1' })
export class StudentEnrollmentsController {
  constructor(private readonly enrollmentService: StudentEnrollmentService) {}

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Mis matrículas y progreso hacia la licencia' })
  @ApiOkResponse({ type: EnrollmentProgressDto, isArray: true })
  listMine(@CurrentUser() user: JwtPayload): Promise<EnrollmentProgressDto[]> {
    return this.enrollmentService.listForStudent(user.sub, user);
  }

  @Post('me')
  @Roles(UserRole.STUDENT)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Matricularme en una categoría de licencia' })
  @ApiCreatedResponse({ type: EnrollmentProgressDto })
  enrollMe(
    @Body() dto: CreateMyEnrollmentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<EnrollmentProgressDto> {
    return this.enrollmentService.enroll(user.sub, dto.licenseCategoryId);
  }

  @Get('me/blocked-license-categories')
  @Roles(UserRole.STUDENT)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Categorías bloqueadas (obsoleto; siempre vacío — tras cancelar se puede rematricular)',
  })
  @ApiOkResponse({ type: String, isArray: true })
  listBlockedLicenseCategories(@CurrentUser() user: JwtPayload): Promise<string[]> {
    return this.enrollmentService.listBlockedCategoryIdsForStudent(user.sub);
  }

  @Get('me/:id')
  @Roles(UserRole.STUDENT)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Progreso de una matrícula propia' })
  @ApiOkResponse({ type: EnrollmentProgressDto })
  getMyProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<EnrollmentProgressDto> {
    return this.enrollmentService.getProgress(id, user);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Listar matrículas (admin)' })
  @ApiOkResponse({ type: EnrollmentProgressDto, isArray: true })
  listAdmin(
    @Query('studentId') studentId?: string,
  ): Promise<EnrollmentProgressDto[]> {
    return this.enrollmentService.listForAdmin(studentId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Matricular estudiante (admin)' })
  @ApiCreatedResponse({ type: EnrollmentProgressDto })
  enrollAdmin(@Body() dto: CreateEnrollmentDto): Promise<EnrollmentProgressDto> {
    return this.enrollmentService.enroll(dto.studentId, dto.licenseCategoryId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Progreso de matrícula' })
  @ApiOkResponse({ type: EnrollmentProgressDto })
  @ApiForbiddenResponse()
  getProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<EnrollmentProgressDto> {
    return this.enrollmentService.getProgress(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Cancelar matrícula activa' })
  @ApiNoContentResponse()
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.enrollmentService.cancelEnrollment(id, user);
  }
}
