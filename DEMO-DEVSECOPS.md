# Demo DevSecOps — "El pipeline atrapa una contraseña filtrada"

Guía para mostrar en clase **qué es DevSecOps**: cómo un pipeline de CI/CD
puede **detener automáticamente** un cambio inseguro antes de que llegue a
producción. Usamos [Semgrep](https://semgrep.dev) (análisis de seguridad del
código, o *SAST*) ya configurado en `.github/workflows/semgrep.yml`.

## La idea en una frase

> Un desarrollador, sin querer, escribe una **contraseña / llave de AWS
> directamente en el código**. Al abrir el Pull Request, el pipeline de
> seguridad lo **detecta y bloquea** 🔴. Se corrige moviendo el secreto a una
> variable de entorno y el pipeline pasa 🟢.

Es el concepto de **"shift-left security"**: mover la seguridad al inicio del
proceso, automatizada, en vez de descubrir el problema tarde.

## Antes de la clase (una sola vez)

1. En GitHub → **Settings → Secrets and variables → Actions**, crear el secret
   `SEMGREP_APP_TOKEN` con tu token de Semgrep.
2. Verifica que el workflow **Semgrep** aparezca en la pestaña *Actions*.

> ¿Demo sin token? En `.github/workflows/semgrep.yml` cambia la línea
> `semgrep ci ...` por:
> `semgrep scan --config ./semgrep-rules --config "p/default" --error`
> (no necesita token ni cuenta).

---

## Guion de la demo (5–8 min)

### Paso 1 — Mostrar el "antes" (todo verde)
Abre la pestaña **Actions** y muestra que el pipeline de seguridad corre en
cada Pull Request. "Este robot revisa el código en busca de problemas de
seguridad, solo."

### Paso 2 — Introducir la vulnerabilidad
Crea una rama y agrega un archivo `src/config/secrets.ts` con esto
(el clásico error de "dejar la llave puesta"):

```ts
// ❌ MALA PRÁCTICA (a propósito, para la demo)
export const awsConfig = {
  region: "us-east-1",
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
};

export const ADMIN_PASSWORD = "SuperSecreta123!";
```

Haz commit y **abre un Pull Request** contra tu rama principal.

Por consola sería:
```bash
git checkout -b demo/credencial-filtrada
mkdir -p src/config
# (pega el contenido de arriba en src/config/secrets.ts)
git add src/config/secrets.ts
git commit -m "Agregar configuración de AWS"   # el dev no nota el problema
git push -u origin demo/credencial-filtrada
```

### Paso 3 — El pipeline lo bloquea 🔴
En el Pull Request, la verificación **Semgrep** falla. Abre el detalle y muestra
el mensaje (en español, escrito por nosotros en `semgrep-rules/`):

> 🔴 **Credencial o secreto hardcodeado en el código.** Nunca escribas
> contraseñas, API keys ni tokens directamente en el código: quedan expuestos
> en el repositorio para siempre…

Puntos para comentar con la clase:
- El PR **no se puede mergear** si proteges la rama (Settings → Branches →
  *Require status checks*). Es una **compuerta de seguridad** automática.
- Aunque después borres la contraseña, **queda en el historial de Git**: por eso
  hay que rotarla. "Lo que se sube, se considera comprometido."
- Nadie tuvo que revisar a mano: la seguridad está **automatizada en el
  pipeline** (eso es la "Sec" de DevSecOps).

### Paso 4 — Corregir (mover el secreto afuera) 🟢
Edita `src/config/secrets.ts` para leer los valores de **variables de entorno**,
no del código:

```ts
// ✅ CORRECTO: los secretos vienen de variables de entorno / del pipeline
export const awsConfig = {
  region: import.meta.env.VITE_AWS_REGION,
  accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
  secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
};

export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
```

Haz commit y push. El pipeline vuelve a correr y ahora pasa **verde** ✅.
Conecta el aprendizaje: *así* configuramos el propio token de Semgrep
(como secret del repo), no dentro del código.

---

## Qué detecta la regla (`semgrep-rules/hardcoded-secrets.yml`)

1. **`credencial-hardcodeada`**: variables cuyo nombre sugiere secreto
   (`password`, `secret`, `apiKey`, `token`, `accessKey`, …) asignadas a un
   texto fijo.
2. **`aws-access-key-hardcodeada`**: cualquier AWS Access Key ID por su formato
   (`AKIA` + 16 caracteres).

Ambas están probadas: el archivo vulnerable falla el pipeline (exit 1) y la
versión corregida pasa (exit 0).

## Conceptos DevSecOps que ilustra la demo

| Concepto | Cómo se ve en la demo |
| --- | --- |
| **Shift-left security** | El problema se detecta en el PR, no en producción. |
| **SAST** (análisis estático) | Semgrep lee el código sin ejecutarlo. |
| **Security gate** | El check bloquea el merge si hay hallazgos. |
| **Gestión de secretos** | La solución: variables de entorno / secrets, no código. |
| **Automatización** | Nadie revisa a mano; corre solo en cada cambio. |

## Otras vulnerabilidades para variar la demo

Si quieres repetirla con otro caso, la misma idea aplica a: **XSS** (mostrar HTML
del usuario sin sanitizar) o **`eval()`** (ejecutar texto como código). Pídelo y
te dejo la regla y el ejemplo listos.
