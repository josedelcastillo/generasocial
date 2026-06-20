import { defineAuth } from '@aws-amplify/backend';

/**
 * Autenticación con Cognito.
 *
 * - Login por email (los coaches se registran con su correo).
 * - Grupo "ADMIN": coordinación de Genera. Se asigna manualmente desde la
 *   consola de Cognito (o con `ampx`) a las pocas personas que coordinan.
 * - Cualquier usuario autenticado que NO esté en ADMIN se trata como coach.
 *   El perfil del coach (CoachProfile) se vincula por su email, y normalmente
 *   se carga previamente por CSV desde el panel de administración.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ['ADMIN'],
});
