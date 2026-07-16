// Configuración de la integración con AWS.
// Los secretos se leen de variables de entorno (Vite: VITE_*), NUNCA del código.
export const awsConfig = {
  region: import.meta.env.VITE_AWS_REGION,
  accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
  secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
};

export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
