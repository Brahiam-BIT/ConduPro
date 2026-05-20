import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
} from '@nestjs/swagger';

import { ApiStandardResponses } from '../common/decorators/api-standard-responses.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { SetAvailabilityDto, UserAvailabilitySlotDto } from './dto/set-availability.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Listar usuarios (solo ADMIN)' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  @ApiForbiddenResponse()
  findAll(@Query() query: UserListQueryDto): Promise<PaginatedResponseDto<UserResponseDto>> {
    return this.usersService.findAll(query);
  }

  @Get(':id/availability')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Disponibilidad semanal del instructor (stub)' })
  @ApiOkResponse({ type: UserAvailabilitySlotDto, isArray: true })
  getAvailability(@Param('id', ParseUUIDPipe) id: string): Promise<UserAvailabilitySlotDto[]> {
    return this.usersService.getAvailability(id);
  }

  @Put(':id/availability')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Guardar disponibilidad semanal del instructor (stub)' })
  @ApiOkResponse({ type: UserAvailabilitySlotDto, isArray: true })
  setAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetAvailabilityDto,
  ): Promise<UserAvailabilitySlotDto[]> {
    return this.usersService.setAvailability(id, dto.slots);
  }

  @Get(':id')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Obtener usuario por ID (solo ADMIN)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Crear usuario (solo ADMIN)' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'Email ya registrado' })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.createUser(dto);
  }

  @Patch(':id')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Actualizar usuario (solo ADMIN)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(id, dto);
  }
}
