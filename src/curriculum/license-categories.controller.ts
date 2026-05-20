import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ApiStandardResponses } from '../common/decorators/api-standard-responses.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurriculumService } from './curriculum.service';
import { LicenseCategoryResponseDto } from './dto/license-category-response.dto';
import { UpdateLicenseCategoryDto } from './dto/update-license-category.dto';

@ApiTags('curriculum')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN)
@Controller({ path: 'license-categories', version: '1' })
export class LicenseCategoriesController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Get()
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Listar categorías de licencia (A1, B1, C1, …)' })
  @ApiOkResponse({ type: LicenseCategoryResponseDto, isArray: true })
  @ApiForbiddenResponse()
  findAll(): Promise<LicenseCategoryResponseDto[]> {
    return this.curriculumService.findAllCategories();
  }

  @Get(':id')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Obtener categoría por ID' })
  @ApiOkResponse({ type: LicenseCategoryResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LicenseCategoryResponseDto> {
    return this.curriculumService.findCategory(id);
  }

  @Patch(':id')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Actualizar categoría (nombre, descripción, cupo teórico)' })
  @ApiOkResponse({ type: LicenseCategoryResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLicenseCategoryDto,
  ): Promise<LicenseCategoryResponseDto> {
    return this.curriculumService.updateCategory(id, dto);
  }
}
