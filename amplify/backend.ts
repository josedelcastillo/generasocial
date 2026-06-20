import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

/**
 * Backend de Genera Social.
 * Define autenticación (Cognito) y datos (DynamoDB vía AppSync GraphQL).
 * Todo se mantiene dentro del free tier de AWS a la escala del proyecto.
 */
defineBackend({
  auth,
  data,
});
