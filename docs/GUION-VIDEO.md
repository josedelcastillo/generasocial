# Guion del video de la demo DevSecOps (≤ 2 min)

Video para incrustar en la presentación. Está pensado para una audiencia que
**no necesariamente conoce GitHub**: por eso alterna entre el **diagrama del
modelo** (`docs/flujo-devsecops.png`) y la **demo real** en GitHub. Cada vez que
aparece algo técnico, primero se muestra en el diagrama "dónde estamos".

> Idea central que debe quedar: *el pipeline revisa cada cambio y **bloquea**
> automáticamente lo inseguro antes de que llegue a producción.*

## Antes de grabar (checklist)
- Pantalla en **1920×1080**; navegador con zoom **125%** (texto grande y legible).
- Ten abiertas 2 pestañas: (1) el diagrama a pantalla completa, (2) el PR en GitHub.
- Oculta datos personales (barras de marcadores, correo).
- Graba con **OBS Studio**, **Loom** o, en Windows, **Xbox Game Bar** (`Win + G`).
- Exporta en **MP4 (H.264)** — es el formato que PowerPoint incrusta sin problemas.

---

## Storyboard (tiempos aproximados)

| Tiempo | En pantalla | Narración (lo que dices) |
|---|---|---|
| **0:00–0:12** | **Diagrama** completo | "En DevSecOps, la seguridad no es un paso manual al final: vive **dentro del pipeline**. Cada cambio de código pasa por un robot que lo revisa antes de aceptarlo. Veámoslo con un ejemplo real." |
| **0:12–0:30** | **GitHub**: el archivo `src/config/secrets.ts` con el secreto | "Un desarrollador, sin darse cuenta, escribió una **contraseña y una llave de AWS directamente en el código**. Es uno de los errores más comunes y peligrosos: cualquiera que vea el proyecto, las ve." |
| **0:30–0:38** | **Diagrama**, señalando el nodo *Pipeline CI/CD* | "Cuando propone su cambio —esto se llama *Pull Request*, una solicitud para entrar al proyecto— el pipeline se activa **solo**." |
| **0:38–1:05** | **GitHub**: el Pull Request → check **rojo** + el **comentario del bot** con la tabla | "Y aquí está la magia: el pipeline **falla en rojo** y, además, deja un **comentario automático** explicando qué encontró, dónde, y cómo corregirlo. Nadie tuvo que revisarlo a mano." |
| **1:05–1:18** | **Diagrama**, rama **roja** (Bloqueado → corrige) | "Mientras el problema exista, el cambio queda **bloqueado**: no puede mezclarse con el proyecto. El desarrollador tiene que corregirlo." |
| **1:18–1:45** | **GitHub**: editar el archivo (secretos → variables de entorno), *commit* | "La solución: sacar los secretos del código y leerlos desde **variables de entorno** o secretos del pipeline. Guardamos el cambio…" |
| **1:45–2:00** | **GitHub** check pasa a **verde** → **Diagrama** rama verde (Merge/Deploy) | "…y ahora el pipeline pasa en **verde**. El cambio es seguro y puede continuar a producción. Eso es DevSecOps: seguridad **automática**, en cada cambio." |

---

## Los dos fragmentos de código (ten a mano al grabar)

**Vulnerable** (lo que dispara el bloqueo) — `src/config/secrets.ts`:
```ts
export const awsConfig = {
  region: "us-east-1",
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
};

export const ADMIN_PASSWORD = "SuperSecreta123!";
```

**Corregido** (deja el pipeline en verde):
```ts
export const awsConfig = {
  region: import.meta.env.VITE_AWS_REGION,
  accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
  secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
};

export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
```

---

## Glosario exprés (por si un profesor pregunta)
- **Pull Request (PR):** una propuesta de cambio al proyecto; pide "permiso" para
  entrar. Ahí es donde se revisa antes de aceptar.
- **Pipeline / CI:** una serie de pasos automáticos que se ejecutan en cada cambio
  (compilar, probar, **revisar seguridad**).
- **SAST (lo que hace Semgrep):** revisar el código **sin ejecutarlo**, buscando
  patrones peligrosos (como un secreto escrito a mano).
- **Security gate:** la "compuerta" que **bloquea** el cambio si no pasa la revisión.

## Cómo incrustar el MP4 en PowerPoint
1. Ve a la diapositiva donde quieres el video.
2. **Insertar → Video → Este dispositivo…** y elige tu `.mp4`.
3. Selecciona el video → pestaña **Reproducción**: marca **Iniciar: Al hacer clic**
   (o *Automáticamente*) y, si quieres, **Reproducir a pantalla completa**.
4. (Opcional) **Comprimir medios** (Archivo → Información → Comprimir medios) para
   que el `.pptx` no pese demasiado.

> Consejo: incrusta el diagrama `docs/flujo-devsecops.png` como imagen fija en la
> diapositiva **anterior** al video, para presentar el modelo antes de la demo.
