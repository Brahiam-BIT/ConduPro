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
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { ApiStandardResponses } from '../common/decorators/api-standard-responses.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { TheoryTopicMaterialResponseDto } from './dto/theory-topic-material-response.dto';
import { UploadTheoryMaterialDto } from './dto/upload-theory-material.dto';
import { TheoryTopicMaterialsService } from './theory-topic-materials.service';

@ApiTags('theory-materials')
@ApiBearerAuth('access-token')
@Controller({ path: 'theory-materials', version: '1' })
export class TheoryTopicMaterialsController {
  constructor(private readonly materialsService: TheoryTopicMaterialsService) {}

  @Post()
  @Roles(UserRole.INSTRUCTOR)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Subir material de apoyo para un tema teórico' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'theoryTopicId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        theoryTopicId: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  @ApiCreatedResponse({ type: TheoryTopicMaterialResponseDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadTheoryMaterialDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TheoryTopicMaterialResponseDto> {
    return this.materialsService.upload(
      user.sub,
      dto.theoryTopicId,
      file,
      dto.title,
      dto.description,
    );
  }

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Materiales de mis licencias matriculadas (estudiante)' })
  @ApiOkResponse({ type: TheoryTopicMaterialResponseDto, isArray: true })
  listMine(@CurrentUser() user: JwtPayload): Promise<TheoryTopicMaterialResponseDto[]> {
    return this.materialsService.listForStudent(user.sub);
  }

  @Get('instructor')
  @Roles(UserRole.INSTRUCTOR)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Materiales subidos por el instructor' })
  @ApiOkResponse({ type: TheoryTopicMaterialResponseDto, isArray: true })
  listInstructor(
    @Query('theoryTopicId') theoryTopicId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ): Promise<TheoryTopicMaterialResponseDto[]> {
    return this.materialsService.listForInstructor(
      user.sub,
      theoryTopicId?.trim() || undefined,
    );
  }

  @Get('by-topic/:theoryTopicId')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.STUDENT)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Materiales de un tema (según permisos de matrícula)' })
  @ApiOkResponse({ type: TheoryTopicMaterialResponseDto, isArray: true })
  listByTopic(
    @Param('theoryTopicId', ParseUUIDPipe) theoryTopicId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TheoryTopicMaterialResponseDto[]> {
    return this.materialsService.listByTopicForUser(theoryTopicId, user);
  }

  @Get(':id/file')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'Descargar archivo de material' })
  download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<StreamableFile> {
    return this.materialsService.downloadFile(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiStandardResponses()
  @ApiOperation({ summary: 'Eliminar material subido' })
  @ApiNoContentResponse()
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.materialsService.remove(id, user);
  }
}
