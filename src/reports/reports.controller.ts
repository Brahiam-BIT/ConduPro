import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ApiStandardResponses } from '../common/decorators/api-standard-responses.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import {
  AdminReportSummaryDto,
  DashboardKpisDto,
  InstructorReportRowDto,
  SchedulesByDayPointDto,
} from './dto/admin-dashboard.dto';
import { AvailabilityReportDto } from './dto/availability-report.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { InstructorReportDto } from './dto/instructor-report.dto';
import { StudentReportDto } from './dto/student-report.dto';
import { SummaryReportDto } from './dto/summary-report.dto';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('kpis')
  @Roles(UserRole.ADMIN)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'KPIs del panel admin' })
  @ApiOkResponse({ type: DashboardKpisDto })
  getKpis(@CurrentUser() user: JwtPayload): Promise<DashboardKpisDto> {
    return this.reportsService.getKpis(user);
  }

  @Get('schedules-by-day')
  @Roles(UserRole.ADMIN)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Clases agendadas y completadas por día' })
  @ApiOkResponse({ type: SchedulesByDayPointDto, isArray: true })
  getSchedulesByDay(
    @Query() query: DateRangeQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SchedulesByDayPointDto[]> {
    return this.reportsService.getSchedulesByDay(query, user);
  }

  @Get('by-instructor')
  @Roles(UserRole.ADMIN)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Resumen de clases por instructor' })
  @ApiOkResponse({ type: InstructorReportRowDto, isArray: true })
  getByInstructor(
    @Query() query: DateRangeQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<InstructorReportRowDto[]> {
    return this.reportsService.getByInstructor(query, user);
  }

  @Get('summary')
  @Roles(UserRole.ADMIN)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Resumen global de clases en un período (panel admin)' })
  @ApiOkResponse({ type: AdminReportSummaryDto })
  @ApiForbiddenResponse({ description: 'Solo administradores' })
  getSummary(
    @Query() query: DateRangeQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AdminReportSummaryDto> {
    return this.reportsService.getAdminSummary(query, user);
  }

  @Get('summary/legacy')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Resumen legacy con desglose por estado' })
  @ApiOkResponse({ type: SummaryReportDto })
  getLegacySummary(
    @Query() query: DateRangeQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SummaryReportDto> {
    return this.reportsService.getSummary(query, user);
  }

  @Get('availability')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Ocupación de instructores y vehículos (solo ADMIN)' })
  @ApiOkResponse({ type: AvailabilityReportDto })
  @ApiForbiddenResponse({ description: 'Solo administradores' })
  getAvailability(
    @Query() query: DateRangeQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AvailabilityReportDto> {
    return this.reportsService.getAvailabilityReport(query, user);
  }

  @Get('instructor/:id')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Reporte de instructor (ADMIN o el propio instructor)' })
  @ApiOkResponse({ type: InstructorReportDto })
  @ApiForbiddenResponse({ description: 'Sin permisos' })
  @ApiNotFoundResponse({ description: 'Instructor no encontrado' })
  getInstructorReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DateRangeQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<InstructorReportDto> {
    return this.reportsService.getInstructorReport(id, query, user);
  }

  @Get('student/:id')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Reporte de estudiante (ADMIN o el propio estudiante)' })
  @ApiOkResponse({ type: StudentReportDto })
  @ApiForbiddenResponse({ description: 'Sin permisos' })
  @ApiNotFoundResponse({ description: 'Estudiante no encontrado' })
  getStudentReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DateRangeQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StudentReportDto> {
    return this.reportsService.getStudentReport(id, query, user);
  }
}
