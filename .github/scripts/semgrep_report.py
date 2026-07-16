#!/usr/bin/env python3
"""Convierte el JSON de resultados de Semgrep en un comentario Markdown para el PR."""
import json
import sys

SEVERIDAD = {"ERROR": "🔴 Alta", "WARNING": "🟠 Media", "INFO": "🔵 Baja"}
MARKER = "<!-- semgrep-report -->"


def main() -> None:
    ruta = sys.argv[1] if len(sys.argv) > 1 else "semgrep.json"
    try:
        with open(ruta, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        data = {"results": []}

    resultados = data.get("results", [])

    # El marcador (comentario HTML invisible) permite actualizar el mismo
    # comentario en cada corrida en vez de crear uno nuevo.
    print(MARKER)
    print("## 🛡️ Análisis de seguridad — Semgrep\n")

    if not resultados:
        print("✅ **No se encontraron problemas de seguridad.** ¡Listo para revisar!")
        print(f"\n<sub>Generado automáticamente por el pipeline de seguridad.</sub>")
        return

    n = len(resultados)
    print(
        f"❌ Se encontraron **{n} hallazgo(s)** que deben corregirse "
        f"antes de mergear.\n"
    )
    print("| Severidad | Regla | Ubicación | Detalle |")
    print("|---|---|---|---|")
    for r in resultados:
        extra = r.get("extra", {})
        sev = SEVERIDAD.get(extra.get("severity", "INFO"), extra.get("severity", ""))
        regla = r.get("check_id", "").split(".")[-1]
        archivo = r.get("path", "")
        linea = r.get("start", {}).get("line", "")
        # El mensaje puede tener varias líneas; lo colapsamos y recortamos.
        msg = " ".join(extra.get("message", "").split()).strip()
        if len(msg) > 180:
            msg = msg[:177] + "…"
        print(f"| {sev} | `{regla}` | `{archivo}:{linea}` | {msg} |")

    print(
        "\n> 💡 **Cómo corregir:** nunca guardes contraseñas, API keys ni tokens "
        "en el código. Muévelos a variables de entorno o a *secrets* del "
        "pipeline. Recuerda que un secreto commiteado queda en el historial de "
        "Git para siempre: **rótalo**."
    )
    print(
        f"\n<sub>Generado automáticamente por el pipeline de seguridad · "
        f"reglas en `semgrep-rules/`.</sub>"
    )


if __name__ == "__main__":
    main()
