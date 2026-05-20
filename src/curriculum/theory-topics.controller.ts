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
import { UserRole } from '../common/enums/user-role.enum';
import { CurriculumService } from './curriculum.service';
import {
  CreateTheoryTopicDto,
  UpdateTheoryTopicDto,
} from './dto/theory-topic-payload.dto';
import { TheoryTopicResponseDto } from './dto/theory-topic-response.dto';

@ApiTags('curriculum')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN)
@Controller({ path: 'theory-topics', version: '1' })
export class TheoryTopicsController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Get()
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Listar temas teóricos por categoría' })
  @ApiOkResponse({ type: TheoryTopicResponseDto, isArray: true })
  findByCategory(
    @Query('licenseCategoryId', ParseUUIDPipe) licenseCategoryId: string,
  ): Promise<TheoryTopicResponseDto[]> {
    return this.curriculumService.findTopicsByCategory(licenseCategoryId);
  }

  @Post()
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Crear tema teórico para una categoría' })
  @ApiCreatedResponse({ type: TheoryTopicResponseDto })
  create(@Body() dto: CreateTheoryTopicDto): Promise<TheoryTopicResponseDto> {
    return this.curriculumService.createTopic(dto);
  }

  @Patch(':id')
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Actualizar tema teórico' })
  @ApiOkResponse({ type: TheoryTopicResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTheoryTopicDto,
  ): Promise<TheoryTopicResponseDto> {
    return this.curriculumService.updateTopic(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Eliminar tema teórico' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.curriculumService.removeTopic(id);
  }
}
