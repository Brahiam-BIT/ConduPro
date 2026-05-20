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
import { AvailabilityReportDto } from './dto/availability-report.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { InstructorReportDto } from './dto/instructor-report.dto';
import { StudentReportDto } from './dto/student-report.dto';
import { SummaryReportDto } from './dto/summary-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Resumen global de clases en un período (solo ADMIN)' })
  @ApiOkResponse({ type: SummaryReportDto })
  @ApiForbiddenResponse({ description: 'Solo administradores' })
  getSummary(
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
