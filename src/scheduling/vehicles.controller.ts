import {
  Body,
  Controller,
  Delete,
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
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { UserRole } from '../common/enums/user-role.enum';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  VehicleListQueryDto,
} from './dto/vehicle-payload.dto';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN)
@Controller({ path: 'vehicles', version: '1' })
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Listar vehículos (solo ADMIN)' })
  @ApiOkResponse({ type: VehicleResponseDto, isArray: true })
  @ApiForbiddenResponse()
  findAll(
    @Query() query: VehicleListQueryDto,
  ): Promise<PaginatedResponseDto<VehicleResponseDto>> {
    return this.vehiclesService.findAll(query);
  }

  @Get(':id')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Obtener vehículo por ID' })
  @ApiOkResponse({ type: VehicleResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<VehicleResponseDto> {
    return this.vehiclesService.findOne(id);
  }

  @Post()
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Crear vehículo' })
  @ApiCreatedResponse({ type: VehicleResponseDto })
  @ApiConflictResponse()
  create(@Body() dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    return this.vehiclesService.create(dto);
  }

  @Patch(':id')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Actualizar vehículo' })
  @ApiOkResponse({ type: VehicleResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Eliminar vehículo' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.vehiclesService.remove(id);
  }
}
