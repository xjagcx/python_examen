# Examen sincronizado de Python

Aplicación web lista para ejecutarse localmente o desplegarse en un VPS/servicio como Render, Railway o Fly.io.

## Qué incluye

- Registro de alumnos por nombre.
- Vista sincronizada: todos ven la misma pregunta al mismo tiempo.
- 40 preguntas de Python básico e intermedio bajo.
- 1 minuto por pregunta.
- Envío anticipado de respuesta y espera automática.
- Autoavance cuando todos responden antes del minuto.
- Panel del profesor para iniciar, pausar, avanzar y reiniciar.
- Calificación visible por alumno y promedio grupal.
- Exportación CSV con filas por alumno y columnas por pregunta.
- PDF individual al finalizar.
- Persistencia en archivo JSON local (`exam-db.json`).
- Comunicación en tiempo real con Socket.IO.

## Requisitos

- Node.js 18 o superior.

## Instalación

```bash
npm install
npm start
```

El servidor quedará en:

```bash
http://localhost:3000
```

## Accesos

- Registro de alumnos: `/`
- Vista del alumno: `/student`
- Panel del profesor: `/teacher`

## PIN del profesor

Por defecto el PIN es:

```bash
1234
```

Puedes cambiarlo por variable de entorno.

## Variables de entorno opcionales

```bash
PORT=3000
TEACHER_PIN=1234
QUESTION_DURATION_SECONDS=60
AUTO_ADVANCE_WHEN_ALL_ANSWERED=true
SHOW_LIVE_SCORE_DURING_QUESTION=false
```

### Recomendación importante

`SHOW_LIVE_SCORE_DURING_QUESTION=false` evita que los alumnos sepan si acertaron antes de que se cierre la pregunta actual.

## Lógica de calificación

```text
calificacion = (aciertos / 40) * 10
```

## CSV exportado

El CSV se descarga desde el panel del profesor y contiene:

- `estudiante`
- `P1` ... `P40`
- `aciertos_totales`
- `calificacion_final`

Cada `P#` vale `1` si la respuesta fue correcta y `0` si fue incorrecta o no respondida.

## PDF del alumno

Al finalizar el examen, cada alumno puede descargar un PDF con:

- Nombre
- Fecha de inicio y cierre
- Aciertos totales
- Calificación final
- Detalle pregunta por pregunta

## Notas de despliegue

Para 15 alumnos simultáneos, esta arquitectura es más que suficiente. Si la despliegas en internet, basta con publicar este servidor Node y mantener el puerto abierto del servicio administrado.

## Estructura del proyecto

```text
python_exam_app/
  data/questions.js
  public/index.html
  public/student.html
  public/teacher.html
  public/student.js
  public/teacher.js
  public/styles.css
  server.js
  package.json
```


## Despliegue rápido en Render

1. Sube esta carpeta a un repositorio nuevo en GitHub.
2. En Render, elige **New +** -> **Blueprint** o **Web Service**.
3. Conecta el repositorio y selecciona la rama principal.
4. Si usas **Blueprint**, Render leerá `render.yaml` automáticamente.
5. Define al menos estas variables:
   - `TEACHER_PIN` = tu PIN real
   - `QUESTION_DURATION_SECONDS` = `60`
   - `AUTO_ADVANCE_WHEN_ALL_ANSWERED` = `true`
   - `SHOW_LIVE_SCORE_DURING_QUESTION` = `false`
6. Despliega y abre la URL pública que Render te entregue.
7. El panel del profesor quedará en `/teacher`.

### Importante sobre datos

Esta versión guarda datos en `exam-db.json`. En Render funciona bien para una sola instancia, pero si el servicio se reinicia o se vuelve a desplegar, ese archivo puede perderse. Para un examen real, úsala así solo si:

- vas a correr una sola instancia, y
- no te preocupa perder resultados tras un redeploy o reinicio.

Si quieres una versión más robusta, conviene migrarla a Supabase o SQLite con disco persistente.
# python_examen
