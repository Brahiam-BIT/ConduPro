import { Body, Controller, ForbiddenException, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ScheduleResponseDto } from '../scheduling/dto/schedule-response.dto';
import { AssignmentService } from './assignment.service';
import { AutoAssignDto } from './dto/auto-assign.dto';

@ApiTags('assignment')
@ApiBearerAuth('access-token')
@Controller({ path: 'schedules', version: '1' })
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post('auto-assign')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Asignación automática de clase' })
  @ApiCreatedResponse({ type: ScheduleResponseDto })
  @ApiNotFoundResponse({ description: 'Sin instructores, vehículos, aulas o disponibilidad' })
  @ApiConflictResponse({ description: 'Conflicto de horario' })
  @ApiForbiddenResponse({ description: 'Sin permisos' })
  autoAssign(
    @Body() dto: AutoAssignDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ScheduleResponseDto> {
    if (user.role === UserRole.STUDENT && dto.studentId !== user.sub) {
      throw new ForbiddenException('Solo puede auto-asignar clases para su propia cuenta');
    }
    return this.assignmentService.autoAssign(dto);
  }
}
