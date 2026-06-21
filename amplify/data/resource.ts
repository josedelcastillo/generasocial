import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * Modelo de datos de Genera Social.
 *
 * Reglas de autorización (resumen):
 *  - ADMIN: CRUD completo sobre todos los modelos operativos.
 *  - Coaches (autenticados, no admin): lectura del catálogo, y pueden
 *    crear/actualizar sus sesiones (agendar, marcar realizada, agregar sesión).
 *  - Aprendizaje: privado del coach que lo escribe (allow.owner). Ni siquiera
 *    el admin puede leer su contenido; el dashboard usa Sesion para las métricas.
 *
 * Relaciones:
 *  Organizacion 1—N Beneficiario
 *  CoachProfile 1—N Asignacion        (un coach puede tener varios beneficiarios)
 *  Beneficiario 1—N Asignacion        (un beneficiario puede tener más de un coach)
 *  Sorteo       1—N Asignacion
 *  Asignacion   1—N Sesion
 *  Sesion       1—N Aprendizaje
 */
const schema = a.schema({
  Organizacion: a
    .model({
      nombre: a.string().required(),
      beneficiarios: a.hasMany('Beneficiario', 'organizacionId'),
    })
    .authorization((allow) => [
      allow.group('ADMIN'),
      allow.authenticated().to(['read']),
    ]),

  Beneficiario: a
    .model({
      nombre: a.string().required(),
      organizacionId: a.id(),
      organizacion: a.belongsTo('Organizacion', 'organizacionId'),
      activo: a.boolean().default(true),
      notas: a.string(),
      asignaciones: a.hasMany('Asignacion', 'beneficiarioId'),
    })
    .authorization((allow) => [
      allow.group('ADMIN'),
      allow.authenticated().to(['read']),
    ]),

  CoachProfile: a
    .model({
      nombre: a.string().required(),
      email: a.string().required(),
      activo: a.boolean().default(true),
      asignaciones: a.hasMany('Asignacion', 'coachId'),
    })
    .authorization((allow) => [
      allow.group('ADMIN'),
      allow.authenticated().to(['read']),
    ]),

  Sorteo: a
    .model({
      fecha: a.datetime().required(),
      organizacionId: a.id(),
      fechaObjetivo: a.date(),
      sesionesPorAsignacion: a.integer().required(),
      cantidadAsignaciones: a.integer(),
      ejecutadoPor: a.string(),
      asignaciones: a.hasMany('Asignacion', 'sorteoId'),
    })
    .authorization((allow) => [
      allow.group('ADMIN'),
      allow.authenticated().to(['read']),
    ]),

  Asignacion: a
    .model({
      coachId: a.id().required(),
      coach: a.belongsTo('CoachProfile', 'coachId'),
      beneficiarioId: a.id().required(),
      beneficiario: a.belongsTo('Beneficiario', 'beneficiarioId'),
      organizacionId: a.id(),
      sorteoId: a.id(),
      sorteo: a.belongsTo('Sorteo', 'sorteoId'),
      sesionesPlaneadas: a.integer().required(),
      fechaAsignacion: a.date(),
      fechaObjetivo: a.date(),
      estado: a.enum(['activa', 'finalizada']),
      sesiones: a.hasMany('Sesion', 'asignacionId'),
    })
    .authorization((allow) => [
      allow.group('ADMIN'),
      allow.authenticated().to(['read', 'update']),
    ]),

  Sesion: a
    .model({
      asignacionId: a.id().required(),
      asignacion: a.belongsTo('Asignacion', 'asignacionId'),
      coachId: a.id().required(),
      beneficiarioId: a.id().required(),
      numero: a.integer(),
      fecha: a.date(),
      estado: a.enum(['por_agendar', 'agendada', 'realizada']),
      aprendizajes: a.hasMany('Aprendizaje', 'sesionId'),
    })
    .authorization((allow) => [
      allow.group('ADMIN'),
      allow.authenticated().to(['read', 'create', 'update']),
    ]),

  Aprendizaje: a
    .model({
      sesionId: a.id().required(),
      sesion: a.belongsTo('Sesion', 'sesionId'),
      texto: a.string().required(),
      coachId: a.id(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
