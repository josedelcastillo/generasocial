#!/usr/bin/env python3
"""
Carga datos DEMO en el backend desplegado de Genera Social (rama main).

Crea:
  - 4 organizaciones, 36 beneficiarios, 24 coaches (CoachProfile)
  - 24 usuarios coach en Cognito (mismo email que su CoachProfile)
  - 2 sorteos con asignaciones y sesiones en distintos estados
  - Aprendizajes de ejemplo (privados, con owner = usuario Cognito del coach)

Todo lo creado se registra en scripts/.seed_manifest.json para poder borrarlo:

  python3 scripts/seed_demo.py          # cargar
  python3 scripts/seed_demo.py --clean  # borrar todo lo cargado

Requisitos: credenciales AWS (aws configure) y boto3.
"""
import json
import random
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import boto3

REGION = "us-east-1"
API_ID = "c3a6frrjfzghhhh7uzjiefx4vu"
USER_POOL_ID = "us-east-1_InbyLTgkD"
COACH_PASSWORD = "GeneraDemo#2026"
EJECUTADO_POR = "j.delcastillos@gmail.com"
MANIFEST = Path(__file__).with_name(".seed_manifest.json")

ddb = boto3.resource("dynamodb", region_name=REGION)
cognito = boto3.client("cognito-idp", region_name=REGION)
random.seed(42)


def table(model: str):
    return ddb.Table(f"{model}-{API_ID}-NONE")


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def item(typename: str, created: datetime, **fields) -> dict:
    ts = iso(created)
    base = {"id": str(uuid.uuid4()), "__typename": typename, "createdAt": ts, "updatedAt": ts}
    base.update({k: v for k, v in fields.items() if v is not None})
    return base


ORGANIZACIONES = {
    "Fundación Esperanza": [
        "Pedro Gómez", "Ana Martínez", "Rosa Quispe", "Miguel Huamán", "Elena Vargas",
        "Jorge Castillo", "Carmen Flores", "Raúl Mendoza", "Patricia Rojas",
    ],
    "ONG Manos Unidas": [
        "Carlos Díaz", "Sofía López", "Luis Chávez", "Gabriela Torres", "Fernando Ramos",
        "Isabel Cruz", "Diego Paredes", "Verónica Salazar", "Andrés Espinoza", "Milagros Ríos",
    ],
    "Casa de la Mujer Emprendedora": [
        "Lourdes Gutiérrez", "Yesenia Campos", "Marisol Herrera", "Diana Cáceres",
        "Roxana Medina", "Teresa Aguilar", "Silvia Navarro", "Claudia Soto",
    ],
    "Asociación Jóvenes Líderes": [
        "Kevin Palacios", "Brenda Núñez", "Renzo Vega", "Alejandra Ortiz", "Bruno Silva",
        "Camila Ponce", "Sebastián León", "Valeria Arias", "Joaquín Morales",
    ],
}

COACHES = [
    "María Pérez", "Juan Rodríguez", "Lucía Fernández", "Ricardo Salas", "Daniela Benavides",
    "Gonzalo Ugarte", "Natalia Zevallos", "Héctor Villanueva", "Mónica Alvarado", "Óscar Delgado",
    "Paola Cornejo", "Eduardo Bustamante", "Cecilia Montoya", "Alberto Lozano", "Rocío Valdivia",
    "Martín Carrillo", "Jimena Arce", "Felipe Tapia", "Andrea Guzmán", "Rodrigo Pacheco",
    "Vanessa Linares", "Gustavo Ibáñez", "Mariana Saavedra", "Tomás Cárdenas",
]

APRENDIZAJES = [
    "Noté que cuando hice más silencio, el coachee encontró su propia respuesta. Me cuesta no rescatar.",
    "Aparecieron juicios fuertes sobre su jefe. Trabajamos distinguir hechos de juicios; quedó muy movilizado.",
    "Me enganché con su historia y perdí el foco del objetivo de la sesión. Para la próxima: volver al acuerdo inicial.",
    "Buena apertura emocional. El quiebre declarado fue 'no sé pedir ayuda'. Exploramos pedidos efectivos.",
    "Sesión corta por problemas de conexión. Igual logramos definir una acción concreta para la semana.",
    "Observé mi propia ansiedad por 'que la sesión sirva'. Soltar eso hizo la conversación más liviana.",
    "La corporalidad habló antes que las palabras: hombros caídos al hablar de su familia. Lo nombré y se abrió.",
    "Cerramos el proceso. Su declaración final: 'me doy permiso para equivocarme'. Muy emocionante para mí también.",
    "Practiqué escucha sin preparar mi siguiente pregunta. Mejor ritmo, más presencia.",
    "Trabajamos la emoción de resignación frente a buscar empleo. Diseñamos una práctica de ambición pequeña.",
]


def slug(nombre: str) -> str:
    import unicodedata
    s = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode().lower()
    return s.replace(" ", ".")


def crear_usuario_coach(email: str) -> str:
    """Crea (o reutiliza) el usuario Cognito y devuelve su sub."""
    try:
        cognito.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=email,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
            ],
            MessageAction="SUPPRESS",
        )
    except cognito.exceptions.UsernameExistsException:
        pass
    cognito.admin_set_user_password(
        UserPoolId=USER_POOL_ID, Username=email, Password=COACH_PASSWORD, Permanent=True
    )
    user = cognito.admin_get_user(UserPoolId=USER_POOL_ID, Username=email)
    return next(a["Value"] for a in user["UserAttributes"] if a["Name"] == "sub")


def sesiones_para(asig, coach_id, benef_id, planeadas, inicio: date, hoy: date, avance: int, created):
    """Genera sesiones: las primeras `avance` realizadas, luego 1 agendada, el resto por agendar."""
    out = []
    for n in range(1, planeadas + 1):
        fecha_teorica = inicio + timedelta(days=14 * (n - 1) + random.randint(0, 4))
        if n <= avance:
            estado, fecha = "realizada", min(fecha_teorica, hoy - timedelta(days=1))
        elif n == avance + 1 and random.random() < 0.7:
            estado, fecha = "agendada", hoy + timedelta(days=random.randint(1, 12))
        else:
            estado, fecha = "por_agendar", None
        out.append(item(
            "Sesion", created,
            asignacionId=asig, coachId=coach_id, beneficiarioId=benef_id, numero=n,
            fecha=fecha.isoformat() if fecha else None, estado=estado,
        ))
    return out


def seed():
    if MANIFEST.exists():
        sys.exit(f"Ya existe {MANIFEST.name}: los datos demo ya fueron cargados. Usa --clean primero.")

    hoy = date.today()
    ahora = datetime.now(timezone.utc)
    rows: dict[str, list[dict]] = {m: [] for m in
                                   ["Organizacion", "Beneficiario", "CoachProfile", "Sorteo",
                                    "Asignacion", "Sesion", "Aprendizaje"]}
    hace = lambda d: ahora - timedelta(days=d)

    # Catálogo
    benefs = []
    for org_nombre, nombres in ORGANIZACIONES.items():
        org = item("Organizacion", hace(100), nombre=org_nombre)
        rows["Organizacion"].append(org)
        for n in nombres:
            b = item("Beneficiario", hace(98), nombre=n, organizacionId=org["id"], activo=True)
            rows["Beneficiario"].append(b)
            benefs.append(b)

    coaches = []
    usuarios = []
    for nombre in COACHES:
        email = f"{slug(nombre)}@example.com"
        sub = crear_usuario_coach(email)
        usuarios.append(email)
        c = item("CoachProfile", hace(97), nombre=nombre, email=email, activo=True)
        c["_sub"] = sub
        rows["CoachProfile"].append(c)
        coaches.append(c)
        print(f"  coach {email}")

    random.shuffle(benefs)

    def asignar(sorteo, coach, benef, planeadas, inicio, avance, finalizada, created):
        a = item("Asignacion", created, coachId=coach["id"], beneficiarioId=benef["id"],
                 organizacionId=benef["organizacionId"], sorteoId=sorteo["id"], sesionesPlaneadas=planeadas,
                 estado="finalizada" if finalizada else "activa")
        rows["Asignacion"].append(a)
        ses = sesiones_para(a["id"], coach["id"], benef["id"], planeadas, inicio, hoy, avance, created)
        rows["Sesion"].extend(ses)
        for s in ses:
            if s["estado"] == "realizada" and random.random() < 0.45:
                sub = coach["_sub"]
                rows["Aprendizaje"].append(item(
                    "Aprendizaje", created, sesionId=s["id"], coachId=coach["id"],
                    texto=random.choice(APRENDIZAJES), owner=f"{sub}::{sub}",
                ))

    # Sorteo 1: hace ~13 semanas, 6 sesiones, 14 asignaciones (avanzadas)
    s1_dt = hace(91)
    s1 = item("Sorteo", s1_dt, fecha=iso(s1_dt), sesionesPorAsignacion=6,
              cantidadAsignaciones=14, ejecutadoPor=EJECUTADO_POR)
    rows["Sorteo"].append(s1)
    for i in range(14):
        finalizada = i < 6
        avance = 6 if finalizada else random.randint(3, 5)
        asignar(s1, coaches[i], benefs[i], 6, (s1_dt + timedelta(days=7)).date(), avance, finalizada, s1_dt)

    # Sorteo 2: hace 3 semanas, 3 sesiones. Prioriza a los 10 coaches sin asignación
    # y suma 4 que ya finalizaron su proceso del sorteo 1.
    s2_dt = hace(21)
    s2 = item("Sorteo", s2_dt, fecha=iso(s2_dt), sesionesPorAsignacion=3,
              cantidadAsignaciones=14, ejecutadoPor=EJECUTADO_POR)
    rows["Sorteo"].append(s2)
    coaches_s2 = coaches[14:24] + coaches[0:4]
    for j, coach in enumerate(coaches_s2):
        asignar(s2, coach, benefs[14 + j], 3, (s2_dt + timedelta(days=4)).date(),
                random.choice([0, 1, 1, 2]), False, s2_dt)
    # Quedan 8 beneficiarios sin asignar (pendientes para el próximo sorteo).

    # Sesiones extra "a demanda" (número 7) en dos procesos finalizados
    for a in [x for x in rows["Asignacion"] if x["estado"] == "finalizada"][:2]:
        rows["Sesion"].append(item(
            "Sesion", hace(10), asignacionId=a["id"], coachId=a["coachId"],
            beneficiarioId=a["beneficiarioId"], numero=7,
            fecha=(hoy - timedelta(days=5)).isoformat(), estado="realizada",
        ))

    for c in rows["CoachProfile"]:
        c.pop("_sub")

    for model, items in rows.items():
        with table(model).batch_writer() as bw:
            for it in items:
                bw.put_item(Item=it)
        print(f"{model}: {len(items)}")

    MANIFEST.write_text(json.dumps(
        {"items": {m: [i["id"] for i in its] for m, its in rows.items()}, "usuarios": usuarios},
        indent=2, ensure_ascii=False,
    ))
    print(f"\nListo. Manifiesto: {MANIFEST}")
    print(f"Contraseña de todos los coaches demo: {COACH_PASSWORD}")


def clean():
    if not MANIFEST.exists():
        sys.exit("No hay manifiesto; nada que borrar.")
    data = json.loads(MANIFEST.read_text())
    for model, ids in data["items"].items():
        with table(model).batch_writer() as bw:
            for i in ids:
                bw.delete_item(Key={"id": i})
        print(f"{model}: borrados {len(ids)}")
    for email in data["usuarios"]:
        try:
            cognito.admin_delete_user(UserPoolId=USER_POOL_ID, Username=email)
        except cognito.exceptions.UserNotFoundException:
            pass
    print(f"Usuarios Cognito borrados: {len(data['usuarios'])}")
    MANIFEST.unlink()


if __name__ == "__main__":
    clean() if "--clean" in sys.argv else seed()
