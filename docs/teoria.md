# Marcos para leer un proceso de diseño

designdiff usa cuatro marcos para analizar cada decisión. No son decoración: cada uno responde una pregunta distinta sobre el proceso, y juntos permiten leerlo como un todo, no solo como una lista de cambios.

| Marco | Pregunta que responde | Campo en `moments.json` |
|---|---|---|
| Design rationale (QOC) | ¿Qué se decidía, entre qué opciones y con qué criterio? | `question`, `ai`, `decision`, `criteria` |
| Práctica reflexiva | ¿Cambió el problema o solo la solución? | `move` |
| Doble diamante | ¿En qué etapa del proceso estaba? | `phase` |
| Seis sombreros | ¿Desde qué tipo de pensamiento se decidió? | `hat` |

Una regla para todos: **se clasifica a partir de lo que la persona dijo, no de lo que supongamos que pensó.** Si la evidencia no alcanza para clasificar, el campo queda vacío. Un campo vacío es más honesto que uno inventado.

---

## 1. Design rationale: preguntas, opciones y criterios (QOC)

**Origen.** MacLean, Young, Bellotti y Moran, *Questions, Options, and Criteria: Elements of Design Space Analysis* (1991). Propone documentar el diseño como un espacio de decisiones y no solo como el resultado final.

**Para qué sirve acá.** Es la estructura de cada momento. Toda decisión responde una **pregunta** de diseño, elige entre **opciones** (como mínimo, la que propuso la IA y la que eligió la persona) y lo hace según un **criterio**.

**Cómo aplicarlo.**
- `question`: la pregunta de diseño, formulada como pregunta abierta. "¿Cuánto historial necesita la app para ser útil desde el primer día?", no "Historial".
- `direction`: el punto de partida que puso la persona (brief, referencias, problema detectado). Sin esto, la decisión parece una reacción a la IA y no parte de un proceso propio.
- `ai`: la opción que propuso o construyó la IA.
- `decision`: la opción elegida.
- `criteria`: los criterios que pesaron, en 1 a 3 palabras cada uno, sacados de lo que dijo la persona. Ejemplos: "confianza", "esfuerzo del usuario", "legibilidad", "costo de mantenimiento".

**Qué revela en conjunto.** Los criterios que se repiten son los **principios reales** de quien diseña, demostrados con decisiones y no declarados en una presentación. Si "esfuerzo del usuario" aparece en cinco decisiones, es un principio.

---

## 2. Práctica reflexiva: reencuadre o ajuste

**Origen.** Donald Schön, *The Reflective Practitioner* (1983). Describe el diseño como una "conversación con la situación": quien diseña hace un movimiento, la situación responde y esa respuesta cambia cómo entiende el problema. Con agentes de IA, la situación literalmente responde: cada propuesta de la IA es una respuesta.

**Para qué sirve acá.** Distingue dos tipos de decisión que pesan muy distinto:

- **`reencuadre`**: la decisión cambia **qué problema** se está resolviendo. "No es una app para registrar gastos, es una app para no tener que registrarlos." Después de un reencuadre, parte del trabajo anterior deja de servir.
- **`ajuste`**: la decisión mejora **la solución** dentro del mismo problema. "El saldo no se lee sobre el degradé."

**Cómo aplicarlo.** Preguntate: si esta decisión no se hubiera tomado, ¿la IA seguiría resolviendo el mismo problema, solo que peor? Si sí, es un ajuste. Si estaría resolviendo otro problema, es un reencuadre.

**Qué revela en conjunto.** Pocos reencuadres y muchos ajustes es lo normal en un proyecto maduro. Los reencuadres son los momentos más valiosos para un caso de estudio, porque muestran criterio de producto. Los ajustes muestran oficio.

---

## 3. Doble diamante

**Origen.** Design Council (Reino Unido, 2005). Divide el proceso en dos diamantes y cuatro fases. Cada diamante primero abre opciones (divergir) y después las cierra (converger).

| `phase` | Diamante | Movimiento | Se reconoce cuando la persona… |
|---|---|---|---|
| `descubrir` | Problema | Diverge | explora referencias, usuarios, el contexto, cómo lo resuelven otros |
| `definir` | Problema | Converge | decide cuál es el problema, para quién y qué queda afuera |
| `desarrollar` | Solución | Diverge | prueba alternativas, pide variantes, explora direcciones |
| `entregar` | Solución | Converge | pule, corrige, recorta para publicar, decide cuándo y a quién abrirlo |

**Cómo aplicarlo.** La fase se decide por **lo que hace la decisión**, no por la fecha. Un recorte de alcance en la última semana es `definir`, aunque el proyecto esté casi terminado.

**Qué revela en conjunto.** El orden de las fases a lo largo del tiempo. Un proceso real casi nunca es lineal: volver a `definir` después de `desarrollar` no es un error, es aprendizaje, y conviene mostrarlo. Si no hay ninguna decisión de `descubrir`, es una señal honesta de que el proyecto arrancó por la solución.

---

## 4. Seis sombreros para pensar

**Origen.** Edward de Bono, *Six Thinking Hats* (1985). Es una técnica de facilitación: un grupo "se pone" un sombrero a la vez para pensar desde un solo modo. Acá **no se usa como técnica de taller sino como lente de análisis**: identifica qué modo de pensamiento dominó cada decisión.

| `hat` | Modo | Se reconoce en frases como… |
|---|---|---|
| `blanco` | Datos e información: qué sabemos, qué falta | "Mercado Pago no devuelve ese dato", "la API solo trae los últimos 90 días" |
| `rojo` | Intuición y emoción, sin justificar | "no me gusta", "se siente genérico", "no me cierra" |
| `negro` | Riesgo y cautela: qué puede salir mal | "queda vulnerable mi información", "todavía no quiero que entre nadie" |
| `amarillo` | Valor y beneficio: por qué conviene | "así no tenés que cargar nada", "esto hace que escale a más gente" |
| `verde` | Creatividad y alternativas | "¿y si en vez de vincular cada banco…?", "capaz con un onboarding corto" |
| `azul` | Proceso y prioridades: qué hacer primero | "primero que funcione", "eso lo dejamos para después" |

**Cómo aplicarlo.** Un solo sombrero por decisión: el que **mejor explica el porqué**. Si la persona propone una alternativa por miedo a un riesgo, el sombrero es `negro` (el motivo), no `verde` (la forma).

**Qué revela en conjunto.** El perfil de pensamiento de quien diseña:
- Mucho `negro` y `azul`: decisiones conservadoras y ordenadas. Cuida el riesgo y el foco.
- Mucho `verde`: explora. Conviene ver si también converge.
- Mucho `rojo`: decide por criterio estético o intuición. Es valioso, pero un caso de estudio más fuerte lo acompaña con evidencia.
- Poco `blanco`: se decidió con pocos datos. Es una señal útil para saber dónde sumar investigación, no una crítica.

---

## 5. Principios con nombre (opcional)

Si una decisión aplica claramente un principio conocido, se puede nombrar en `principle`. **Solo si la relación es directa**: forzar un principio para que la decisión parezca más académica le quita credibilidad.

Algunos que aparecen seguido:
- **Heurísticas de Nielsen (1994):** visibilidad del estado del sistema, reconocer antes que recordar, prevención de errores, diseño minimalista, control y libertad del usuario, consistencia.
- **Ley de Hick:** más opciones, más tiempo para decidir. Aparece en recortes.
- **Divulgación progresiva:** mostrar solo lo necesario y revelar el resto cuando hace falta. Aparece en onboardings.
- **Valores por defecto razonables:** que la app funcione bien sin configurar nada.
- **Privacidad por diseño (Cavoukian):** pedir el mínimo acceso necesario.
- **Contraste WCAG:** legibilidad del texto sobre su fondo.

---

## Lectura de conjunto

`render.mjs` cruza estos campos y genera una sección **"Cómo se pensó"** al principio de la página: los criterios que más se repiten, la proporción de reencuadres y ajustes, el recorrido por las fases del doble diamante y el perfil de sombreros. Esa sección es la que convierte una lista de cambios en un proceso legible.
