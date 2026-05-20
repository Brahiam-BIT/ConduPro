import { ApiProperty } from '@nestjs/swagger';

import { LicenseGroup } from '../enums/license-group.enum';

export class LicenseCategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'B1' })
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: LicenseGroup })
  group!: LicenseGroup;

  @ApiProperty({ example: 'Servicio particular' })
  groupLabel!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  defaultTheoryCapacity!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ description: 'Cantidad de temas teóricos activos en el temario' })
  topicCount!: number;

  @ApiProperty({ description: 'Clases prácticas requeridas para la licencia', example: 20 })
  requiredPracticeSessions!: number;

  @ApiProperty({
    description: 'Si el estudiante debe completar todos los temas teóricos activos',
  })
  requiresAllTheoryTopics!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
