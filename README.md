# Genera Social

Plataforma para gestionar el frente social de **Genera** (escuela de coaching
ontológico): asignación aleatoria de coaches voluntarios a beneficiarios,
registro de sesiones y aprendizajes, y un dashboard de seguimiento.

Construida para **desplegarse en AWS a costo cero** (free tier permanente a la
escala del proyecto) con tecnología sencilla.

## Funcionalidades

- **Sorteo**: asignación aleatoria de beneficiarios pendientes a coaches,
  priorizando a quienes no tienen beneficiarios en curso. Cada sorteo se
  configura con la cantidad de sesiones a programar (3, 6, …) y genera esas
  sesiones automáticamente en estado *Por agendar*.
- **Sesiones**: fecha, coach, beneficiario y estado
  (*Por agendar → Agendada → Realizada*). El coach puede agregar más sesiones
  a demanda.
- **Aprendizajes**: bitácora privada de cada coach por sesión (solo la ve quien
  la escribe).
- **Dashboard**: cantidad de sesiones por organización, por coach y por coachee.
- **Importación CSV** de coaches y beneficiarios.

## Roles

- **Admin** (coordinación de Genera): gestiona organizaciones, beneficiarios y
  coaches; corre el sorteo; ve el dashboard global.
- **Coach**: ve sus beneficiarios asignados, gestiona sus sesiones y registra
  sus aprendizajes.

Un usuario es **Admin** si pertenece al grupo `ADMIN` en Cognito. Cualquier otro
usuario autenticado se trata como **coach**, y su perfil se vincula por email
con el `CoachProfile` cargado por la coordinación.

## Stack

- **Frontend**: React + TypeScript + Vite.
- **Backend (as code)**: AWS Amplify Gen 2 → Cognito (auth) + AppSync/DynamoDB
  (datos).
- **Hosting**: Amplify Hosting (S3 + CloudFront).

## Desarrollo local

Requisitos: Node 18+, [pnpm](https://pnpm.io) (`corepack enable`) y credenciales
de AWS configuradas (`aws configure`).

```bash
pnpm install

# Levanta un backend de pruebas (sandbox) en tu cuenta AWS.
# Genera automáticamente amplify_outputs.json.
pnpm run sandbox       # = npx ampx sandbox  (déjalo corriendo en una terminal)

# En otra terminal, la app web:
pnpm run dev           # http://localhost:5173
```

> Este proyecto usa **pnpm** (fijado en `package.json` → `packageManager`). El
> build de Amplify lo instala vía corepack, así que no necesitas configurarlo.

> `amplify_outputs.json` lo genera Amplify y está en `.gitignore`. No se commitea.

## Despliegue a producción (costo cero)

1. **Sube este repositorio a GitHub** (rama principal).
2. En la **consola de AWS → Amplify → "Deploy an app"**, conecta el repositorio.
   Amplify detecta el backend Gen 2 y despliega backend + frontend con cada push.
3. Al terminar, obtendrás una URL `https://<rama>.<id>.amplifyapp.com`.
4. **Crea el primer admin**: en **Cognito → User pools**, crea/registra tu
   usuario y agrégalo al grupo `ADMIN`.
5. Entra a la app, carga organizaciones, importa coaches y beneficiarios por CSV
   y corre tu primer **Sorteo**.

### ¿Por qué cuesta $0?
A la escala del proyecto (~69 coaches, ~4 organizaciones, decenas de
beneficiarios) el uso cae dentro del free tier permanente de Cognito, DynamoDB,
AppSync, Lambda, S3 y CloudFront.

## Importación CSV / Excel

El importador acepta `.csv` y `.xlsx`. Hay ejemplos en [`samples/`](./samples):

- **Coaches** (`samples/coaches.xlsx` / `.csv`): columnas `nombre`, `email`.
- **Beneficiarios** (`samples/beneficiarios.xlsx` / `.csv`): columnas `nombre`,
  `organizacion` (la organización se crea sola si no existe).

## Metas y semáforos

Cada **sorteo** se hace por organización y fija una **fecha objetivo** (fin de
sesiones); en cada asignación se guarda la **fecha de asignación**. El dashboard
muestra semáforos por organización comparando el tiempo transcurrido con el
avance real:

- 🟢 **En camino** · 🟡 **En riesgo** · 🔴 **Fuera de meta**

Se calculan dos semáforos: **agendamiento** (sesiones agendadas o realizadas) y
**sesiones efectuadas** (realizadas). Las asignaciones existentes sin meta se
pueden completar con un clic a la fecha por defecto (**30/06/2026**).

## Estructura

```
amplify/            Backend as code (Amplify Gen 2)
  auth/resource.ts  Cognito (login por email, grupo ADMIN)
  data/resource.ts  Modelos y reglas de autorización
src/
  pages/            Dashboard, Organizaciones, Beneficiarios, Coaches,
                    Sorteo, MisAsignaciones, MisSesiones
  lib/sorteo.ts     Lógica pura del sorteo
  lib/csv.ts        Importación CSV
  context/AppData   Rol del usuario y perfil de coach
```
