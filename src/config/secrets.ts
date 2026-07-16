// Configuración de la integración con AWS.
export const awsConfig = {
  region: "us-east-1",
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
};

export const ADMIN_PASSWORD = "SuperSecreta123!";

// Token de servicio hardcodeado (mala práctica: secreto expuesto).
export const SERVICE_API_TOKEN = "ghp_1234567890abcdef1234567890abcdef1234";

// Endpoint por HTTP sin cifrar (inseguro: debería ser HTTPS).
export const API_BASE_URL = "http://api.internal.genera.example.com/v1";
