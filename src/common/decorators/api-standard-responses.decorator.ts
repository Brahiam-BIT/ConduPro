import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

/**
 * Respuestas de error comunes documentadas en Swagger.
 */
export const ApiStandardResponses = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiBadRequestResponse({ description: 'Datos de entrada inválidos' }),
    ApiUnauthorizedResponse({ description: 'No autenticado o token inválido' }),
    ApiInternalServerErrorResponse({ description: 'Error interno del servidor' }),
  );
