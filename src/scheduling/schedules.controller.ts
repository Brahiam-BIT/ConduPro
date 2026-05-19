import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { AvailabilityResponseDto } from './dto/availability-response.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';
import { UpdateScheduleStatusDto } from './dto/update-schedule-status.dto';
import { SchedulingService } from './scheduling.service';

@ApiTags('scheduling')
@ApiBearerAuth('access-token')
@Controller({ path: 'schedules', version: '1' })
export class SchedulesController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get('availability')
  @ApiOperation({ summary: 'Slots libres de un instructor en una fecha' })
  @ApiOkResponse({ type: AvailabilityResponseDto })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  getAvailability(@Query() query: AvailabilityQueryDto): Promise<AvailabilityResponseDto> {
    return this.schedulingService.getAvailability(query);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clases agendadas (con filtros y paginación)' })
  @ApiOkResponse({
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/ScheduleResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  findAll(
    @Query() query: ScheduleQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaginatedResponseDto<ScheduleResponseDto>> {
    return this.schedulingService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una clase por ID' })
  @ApiOkResponse({ type: ScheduleResponseDto })
  @ApiNotFoundResponse({ description: 'Clase no encontrada' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ScheduleResponseDto> {
    return this.schedulingService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Crear una clase (valida conflictos)' })
  @ApiCreatedResponse({ type: ScheduleResponseDto })
  @ApiConflictResponse({ description: 'Conflicto de horario' })
  @ApiForbiddenResponse({ description: 'Sin permisos' })
  create(
    @Body() dto: CreateScheduleDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ScheduleResponseDto> {
    return this.schedulingService.create(dto, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Actualizar estado de una clase' })
  @ApiOkResponse({ type: ScheduleResponseDto })
  @ApiNotFoundResponse({ description: 'Clase no encontrada' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleStatusDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ScheduleResponseDto> {
    return this.schedulingService.updateStatus(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Cancelar clase (soft delete)' })
  @ApiOkResponse({ description: 'Clase cancelada' })
  @ApiNotFoundResponse({ description: 'Clase no encontrada' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.schedulingService.cancel(id, user);
  }
}
