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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ApiStandardResponses } from '../common/decorators/api-standard-responses.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { TheoryClassOffersService } from '../assignment/theory-class-offers.service';
import { PracticeClassOffersService } from '../assignment/practice-class-offers.service';
import { JoinTheoryClassDto } from '../assignment/dto/join-theory-class.dto';
import { JoinPracticeClassDto } from '../assignment/dto/join-practice-class.dto';
import { TheoryClassOfferResponseDto } from '../assignment/dto/theory-class-offer-response.dto';
import { TheoryClassOffersQueryDto } from '../assignment/dto/theory-class-offers-query.dto';
import { PracticeClassOfferResponseDto } from '../assignment/dto/practice-class-offer-response.dto';
import { PracticeClassOffersQueryDto } from '../assignment/dto/practice-class-offers-query.dto';
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
  constructor(
    private readonly schedulingService: SchedulingService,
    private readonly theoryClassOffersService: TheoryClassOffersService,
    private readonly practiceClassOffersService: PracticeClassOffersService,
  ) {}

  @Get('availability')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Slots libres de un instructor en una fecha' })
  @ApiOkResponse({ type: AvailabilityResponseDto })
  getAvailability(@Query() query: AvailabilityQueryDto): Promise<AvailabilityResponseDto> {
    return this.schedulingService.getAvailability(query);
  }

  @Get()
  @ApiStandardResponses()
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

  @Get('theory-offers')
  @Roles(UserRole.STUDENT)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Clases teóricas disponibles según matrícula y disponibilidad del instructor',
  })
  @ApiOkResponse({ type: TheoryClassOfferResponseDto, isArray: true })
  listTheoryOffers(
    @Query() query: TheoryClassOffersQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TheoryClassOfferResponseDto[]> {
    return this.theoryClassOffersService.listOffers(user.sub, query);
  }

  @Post('theory-offers/join')
  @Roles(UserRole.STUDENT)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Inscribirse en una clase teórica con cupo' })
  @ApiCreatedResponse({ type: ScheduleResponseDto })
  @ApiConflictResponse({ description: 'Sin cupo o conflicto de horario' })
  joinTheoryClass(
    @Body() dto: JoinTheoryClassDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ScheduleResponseDto> {
    return this.theoryClassOffersService.joinClass(user.sub, dto);
  }

  @Get('practice-offers')
  @Roles(UserRole.STUDENT)
  @ApiStandardResponses()
  @ApiOperation({
    summary: 'Clases prácticas disponibles según matrícula y disponibilidad del instructor',
  })
  @ApiOkResponse({ type: PracticeClassOfferResponseDto, isArray: true })
  listPracticeOffers(
    @Query() query: PracticeClassOffersQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PracticeClassOfferResponseDto[]> {
    return this.practiceClassOffersService.listOffers(user.sub, query);
  }

  @Post('practice-offers/join')
  @Roles(UserRole.STUDENT)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Reservar una clase práctica en un horario del instructor' })
  @ApiCreatedResponse({ type: ScheduleResponseDto })
  @ApiConflictResponse({ description: 'Horario ocupado o sin vehículo' })
  joinPracticeClass(
    @Body() dto: JoinPracticeClassDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ScheduleResponseDto> {
    return this.practiceClassOffersService.joinClass(user.sub, dto);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiStandardResponses()
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
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Actualizar estado de una clase' })
  @ApiOkResponse({ type: ScheduleResponseDto })
  @ApiNotFoundResponse({ description: 'Clase no encontrada' })
  @ApiForbiddenResponse({ description: 'Sin permisos' })
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
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Cancelar clase (soft delete)' })
  @ApiNoContentResponse({ description: 'Clase cancelada' })
  @ApiNotFoundResponse({ description: 'Clase no encontrada' })
  @ApiForbiddenResponse({ description: 'Sin permisos' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.schedulingService.cancel(id, user);
  }

  @Get(':id')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Obtener una clase por ID' })
  @ApiOkResponse({ type: ScheduleResponseDto })
  @ApiNotFoundResponse({ description: 'Clase no encontrada' })
  @ApiForbiddenResponse({ description: 'Sin permisos para ver la clase' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ScheduleResponseDto> {
    return this.schedulingService.findOne(id, user);
  }
}
