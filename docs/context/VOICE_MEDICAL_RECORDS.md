# Numa: análisis de dictado inteligente para registros médicos

Estado del documento: análisis para discusión, 18 de noviembre de 2026. No describe funcionalidad implementada ni constituye todavía un plan de implementación aprobado.

## 1. Resumen ejecutivo

La funcionalidad es viable, pero no debería construirse como «audio directo a un LLM que llena el formulario». Para Numa conviene separar cuatro problemas:

1. capturar el audio;
2. transcribirlo dentro de una frontera controlada;
3. retirar identificadores antes de cualquier servicio externo de IA;
4. extraer un borrador estructurado y resolver sus valores contra los catálogos reales de Numa.

La recomendación inicial es:

- empezar con **dictado individual del médico**, no escucha ambiental de toda la consulta;
- transcribir con un modelo ejecutado en el dispositivo o en infraestructura controlada por Numa; para una prueba inicial, `faster-whisper` con un modelo Whisper multilingüe es la base más accesible, y Deepgram Nova-3 Medical en despliegue privado/VPC es el candidato especializado que merece cotización y comparación;
- anonimizar localmente el texto mediante reglas deterministas, datos conocidos del contexto y un detector local de PII adaptado al español de Honduras;
- enviar únicamente el texto desidentificado a un modelo de lenguaje económico con salida estructurada; **GPT-6 Luna** es el primer candidato por costo y soporte de Structured Outputs, con **GPT-6.1 Terra** como posible escalamiento para casos ambiguos;
- resolver categorías, diagnósticos, órdenes, dosis, frecuencia, vías y seguimiento en el backend. El modelo puede seleccionar candidatos, pero no debe inventar IDs ni códigos clínicos;
- devolver un **borrador** al formulario, destacar qué rellenó la IA y exigir revisión humana antes de guardar;
- no conservar por defecto audio, transcripción cruda, prompts ni respuestas del modelo.

La restricción «no compartir nunca nombres, identificaciones ni otros datos identificables con modelos» cambia la selección tecnológica. Un servicio cloud de voz recibe el audio antes de que podamos anonimizarlo; si el médico pronuncia un nombre, ese proveedor ya lo recibió. Un BAA, Zero Data Retention o una promesa de no entrenar con los datos reduce riesgo contractual y de retención, pero no equivale a «no compartir». Por eso los servicios cloud de transcripción solo son una alternativa si el requisito se reinterpreta explícitamente como «procesamiento por un proveedor autorizado» o si el producto garantiza que el audio no contiene identificadores, algo difícil de asegurar.

## 2. Alcance analizado

Este documento estudia la creación de registros desde la ruta clínica principal de la web y el contrato actual de la API. No propone todavía cambios de código, migraciones ni contratos definitivos.

Quedan fuera de esta primera versión:

- escucha ambiental continua entre médico y paciente;
- resumen de consultas con varios interlocutores;
- toma de decisiones, recomendaciones clínicas o diagnóstico autónomo;
- guardado automático sin confirmación del médico;
- dictado integrado en la aplicación móvil, que continúa siendo un prototipo;
- entrenamiento o fine-tuning con registros reales de pacientes.

## 3. Estado actual de Numa

### 3.1 Formulario real

La ruta principal es `apps/web/src/app/doctor/patients/[id]/records/new/page.tsx`. El formulario crea un `DoctorMedicalRecordCreate` mediante `/api/v1/doctor/patients/{patient_id}/records`.

Campos relevantes:

| Grupo | Campos actuales | Naturaleza y riesgo |
| --- | --- | --- |
| Registro | categoría, motivo, fecha | Categoría es lista cerrada de base de datos; motivo es obligatorio; la fecha no debería inferirse si no se dicta claramente. |
| Evaluación | historia, signos de alerta, examen físico, impresión clínica, notas | Texto libre; signos de alerta es una lista. Deben preservarse negaciones y correcciones. |
| Diagnósticos | diagnóstico, código/sistema, rango, estado | Hasta cinco; búsqueda sobre 700 condiciones, con valor personalizado permitido en la pantalla principal; los códigos solo deben venir del catálogo. |
| Plan | hasta tres puntos, seguimiento, seguimiento con, instrucciones | Seguimiento es una lista cerrada; los demás son texto limitado. |
| Signos vitales | FC, presión sistólica/diastólica, temperatura, FR, saturación, peso, talla, glicemia, circunferencia, notas | Valores numéricos de alto riesgo con unidades implícitas en el contrato. IMC se calcula en la web. |
| Recetas | medicamento, dosis, frecuencia, vía, duración, cantidad, instrucciones | Medicamento es texto libre. Dosis, frecuencia, vía y duración tienen opciones predefinidas, pero el formulario principal también permite valores personalizados. |
| Órdenes | tipo, items, urgencia, motivo, justificación, referencia | Cuatro tipos y tres urgencias cerrados; 182 opciones catalogadas y opción personalizada. |

Observaciones del código actual:

- `catalog_es.json` contiene 700 condiciones, 197 alergias y 37 vacunas. Para este flujo se usa principalmente el catálogo de condiciones.
- `clinical_orders_es.json` contiene 66 opciones de laboratorio, 37 de imagen, 44 de referencia y 35 de procedimiento.
- las opciones de receta están actualmente en TypeScript (`prescriptionOptions.ts`), no en el backend. Antes de hacer resolución por IA conviene que exista una única fuente de verdad versionada accesible al backend;
- el backend ya valida el rol clínico y el acceso concreto al paciente al crear el registro. El futuro endpoint de dictado debe exigir rol de médico y acceso `WRITE` al mismo paciente. No se debe asumir que el modo de UI concede autorización;
- el flujo principal y `new-tabbed` no son idénticos. El análisis toma como contrato funcional la pantalla principal y los esquemas Pydantic, no la variante por tabs.

### 3.2 Dictado existente

Numa ya tiene `use-voice-input.ts`, `speech-recognition.ts`, `InputWithVoice` y `TextareaWithVoice`. Estos componentes dictan un campo a la vez usando Web Speech API. No hacen extracción global ni mapeo de catálogos.

El comportamiento actual no es una frontera de privacidad suficiente. La implementación no solicita procesamiento local (`processLocally`) ni controla el proveedor. Web Speech API tiene disponibilidad limitada y, según la documentación de MDN, algunos navegadores envían el audio a un servicio web por defecto. El reconocimiento local existe en ciertos navegadores, pero depende de soporte y paquetes de idioma instalados. Véase [SpeechRecognition en MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) y [reconocimiento local en Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API).

Esta función existente podría conservarse como conveniencia separada solo después de revisar su privacidad; no debería usarse como base de la nueva función global.

## 4. Interpretación de privacidad

### 4.1 Anónimo, desidentificado y dato clínico no son lo mismo

Quitar nombre y DNI no convierte automáticamente una narración clínica en anónima. Edad exacta, fechas, ubicación, profesión, enfermedades raras, nombres de familiares, hospital o especialista pueden permitir reidentificación. Además, el contenido clínico sigue siendo información sensible aunque ya no identifique directamente a una persona.

Para este diseño se propone usar términos precisos:

- **PII/identificadores directos:** nombre, DNI, correo, teléfono, dirección, número de expediente, identificadores de cuenta y nombres de profesionales o familiares;
- **cuasi-identificadores:** fechas exactas, edad extrema, localidad pequeña, lugar de trabajo u otra combinación singular;
- **texto desidentificado:** texto al que se retiraron o tokenizaron esos elementos según una política explícita;
- **texto clínico sensible:** la información médica restante. Puede ser necesaria para mapear el formulario, pero sigue requiriendo protección contractual y técnica.

### 4.2 Consecuencia arquitectónica

Hay una distinción inevitable: si un nombre se pronuncia, **algún modelo de reconocimiento de voz debe procesar ese sonido** para convertirlo en texto. Por tanto, la interpretación técnicamente viable del requisito es que los identificadores solo puedan ser procesados dentro del perímetro de confianza de Numa y que nunca se transmitan a un modelo o proveedor externo. Si la prohibición fuera literal incluso para un modelo local y controlado, no se podría garantizar la transcripción de audio que accidentalmente contenga un identificador; habría que impedir que se dicte y aceptar que el control depende del usuario.

La primera transcripción debe ocurrir **antes** de llamar a un proveedor externo de LLM. Hay tres formas de lograrlo:

1. reconocimiento en el dispositivo del médico;
2. reconocimiento en un servicio desplegado y operado dentro de la infraestructura controlada por Numa;
3. reconocimiento en un despliegue privado/VPC de un proveedor con límites contractuales y técnicos explícitos, siempre que ese despliegue se acepte formalmente como parte del perímetro de confianza.

Una API pública de transcripción no cumple la lectura estricta del requisito si el audio puede contener nombres. Que el proveedor no entrene con los datos o los borre después no cambia que los procesó.

### 4.3 Marco legal y contractual

Este documento no es asesoría legal. A 18 de noviembre de 2026, el Congreso de Honduras informa que el 29 de octubre se presentó un proyecto general de protección de datos; no debe tratarse todavía como ley vigente. La Ley de Transparencia existente sí clasifica estados de salud, domicilio, teléfono, correo y datos relativos a intimidad como datos personales confidenciales. Fuentes oficiales: [Congreso Nacional sobre el proyecto presentado](https://congresonacional.hn/noticias/6ae2c75b0174ce8e89e66c6f) e [IAIP, Ley de Transparencia](https://iaip.gob.hn/ley-de-transparencia/).

Antes de producción se necesita revisión jurídica de:

- consentimiento y aviso al paciente, aun cuando el dictado ocurra después de la consulta;
- transferencias internacionales y subencargados;
- contrato de tratamiento, retención, borrado y respuesta a incidentes;
- si Numa o sus clientes están sujetos además a HIPAA, GDPR u otra regulación por ubicación o relación comercial;
- tratamiento de grabaciones de voz, que pueden contener datos biométricos además de información clínica.

Un BAA de HIPAA es útil cuando aplica, pero no vuelve a una solución automáticamente conforme ni reemplaza las obligaciones hondureñas. OpenAI, Google, AWS y Microsoft advierten que la configuración y el cumplimiento final siguen siendo responsabilidad del cliente.

## 5. Arquitectura recomendada

### 5.1 Flujo general

```text
Web del médico
  │ 1. MediaRecorder, inicio/parada explícitos
  │    audio acotado; sin nombre de paciente en metadata o filename
  ▼
API Numa /doctor/patients/{id}/dictation-drafts
  │ 2. autentica médico + acceso WRITE al paciente
  │ 3. valida tipo, tamaño, duración y tasa
  ▼
Transcripción privada
  │ 4. STT local/en infraestructura Numa; salida con segmentos
  │ 5. audio se elimina al terminar o fallar
  ▼
Desidentificación local, fail-closed
  │ 6. valores conocidos + reglas + NER local
  │ 7. si queda PII probable, no llama al LLM externo
  ▼
Recuperación de candidatos de catálogos
  │ 8. normalización, sinónimos y fuzzy match; top-k por término
  ▼
LLM de extracción estructurada
  │ 9. solo texto desidentificado + candidatos + JSON Schema
  │    sin herramientas, web, historial del paciente ni acceso a BD
  ▼
Validación determinista en backend
  │ 10. Pydantic, rangos, enums, longitudes, IDs/códigos del catálogo
  │ 11. evidencia, conflictos y campos de revisión
  ▼
Borrador en el formulario
  │ 12. el médico revisa, corrige y confirma campos críticos
  ▼
POST existente de creación del registro
     13. solo la acción explícita Guardar persiste el registro clínico
```

### 5.2 Captura de audio

Para la primera versión conviene grabación acotada, no streaming continuo:

- usar `MediaRecorder` del navegador y un formato habitual como WebM/Opus;
- inicio y final explícitos, indicador visual permanente y contador;
- duración máxima configurable, por ejemplo 5–10 minutos en el piloto;
- opción de cancelar y destruir antes de enviar;
- no incluir nombre, DNI o correo en nombre de archivo, metadata o URL;
- mantener el identificador del paciente solo como contexto de autorización de Numa, nunca como parte del prompt;
- cortar silencios localmente es opcional; no es necesario para validar el concepto.

El dictado puede ser desordenado. No se debe obligar al médico a seguir la pantalla. Sí se le puede enseñar una sintaxis natural opcional —«motivo…», «signos vitales…», «receta…»— porque mejora precisión sin convertirse en requisito.

### 5.3 Procesamiento asíncrono

Una transcripción privada puede tardar más que una petición HTTP normal. El contrato debería admitir un trabajo asíncrono:

```text
POST   /doctor/patients/{id}/dictation-drafts     -> 202 {job_id}
GET    /doctor/patients/{id}/dictation-drafts/{job_id}
DELETE /doctor/patients/{id}/dictation-drafts/{job_id}
```

Estados sugeridos: `UPLOADED`, `TRANSCRIBING`, `DEIDENTIFYING`, `MAPPING`, `READY`, `FAILED`, `EXPIRED`, `CANCELLED`.

No es necesario introducir Redis solo por esta función. Un piloto puede usar un worker y una tabla de trabajos en PostgreSQL con bloqueo seguro. `FastAPI BackgroundTasks` no es durable ante reinicios y no sería suficiente para producción. Si Numa ya incorpora una cola en el futuro, el trabajo podría migrar allí.

La respuesta `READY` contendría un borrador y advertencias, no el audio ni necesariamente la transcripción completa. El frontend aplica el borrador al estado del formulario; el guardado sigue usando la mutación existente.

### 5.4 Desidentificación en capas

Ningún detector de PII es perfecto. La estrategia debe combinar varias capas:

1. **Lista contextual exacta:** nombres y variantes del paciente, médico, familiares conocidos, correo, teléfono, DNI, ubicaciones y centros presentes en el contexto autorizado. Estos datos se usan únicamente dentro de Numa para detectar, no se agregan al prompt.
2. **Reglas locales:** correo, teléfono, DNI, UUID, número de expediente, direcciones y frases como «el paciente se llama», «nació el», «vive en».
3. **NER local en español:** personas, organizaciones y ubicaciones. Presidio permite combinar expresiones regulares, NER y reconocedores personalizados, pero requiere configuración y evaluación para español hondureño; no debe asumirse que funciona correctamente al instalarlo. Véase [Presidio Analyzer](https://microsoft.github.io/presidio/analyzer/) y [operadores de anonimización](https://microsoft.github.io/presidio/anonymizer/).
4. **Tokenización reversible en memoria:** por ejemplo `[PERSONA_1]`, `[ESPECIALISTA_1]`, `[CENTRO_1]`. Un especialista referido puede restaurarse localmente al campo final; el nombre del paciente normalmente se descarta.
5. **Escáner de salida:** revisar otra vez el texto antes de enviarlo y bloquear la llamada si hay coincidencias no resueltas.
6. **Modo fail-closed:** si la confianza de privacidad es insuficiente, ofrecer edición manual del texto o procesar todo con modelos locales; nunca «probar de todos modos» con el servicio externo.

No deben eliminarse indiscriminadamente todas las fechas o números: «síntomas desde hace tres días», «120/80» y «38.5 °C» son datos clínicos. La política tiene que distinguir fecha de nacimiento o cita de una duración o medición.

La instrucción «no devuelvas PII» en un prompt no es una medida de anonimización.

### 5.5 Extracción y resolución de catálogos

El modelo de lenguaje debe extraer intención y relaciones, no controlar los catálogos. Pipeline propuesto:

1. normalizar mayúsculas, acentos y abreviaturas sin modificar el original;
2. detectar menciones probables: diagnósticos, medicamentos, órdenes, valores y unidades;
3. generar candidatos en el backend por coincidencia exacta, sinónimos y similitud léxica;
4. enviar al LLM únicamente los mejores candidatos con identificadores opacos;
5. recibir selección de candidato o `NO_MATCH` mediante JSON Schema;
6. verificar en backend que el candidato pertenece a la versión vigente del catálogo;
7. si el campo permite personalizado, conservar el texto hablado sin código; si es cerrado, dejarlo vacío y marcarlo para revisión.

Reglas por grupo:

| Campo | Política propuesta |
| --- | --- |
| Categoría | Solo una categoría existente retornada por la API; nunca crear una nueva desde dictado. |
| Diagnóstico | Preferir condición catalogada con código. Si no existe y la UI permite valor personalizado, guardar texto sin código y exigir confirmación. Nunca inventar SNOMED/ICD. |
| Estado diagnóstico | Solo enum actual. Si no se dicta, usar el predeterminado visible del formulario y mostrarlo como inferencia, no como dato hablado. |
| Seguimiento | Mapear expresiones como «en una semana» a `7d`; fuera de lista, no seleccionar automáticamente. |
| Medicamento | Mantener texto hablado; hoy no existe catálogo farmacológico en Numa. No corregir marcas o principios activos silenciosamente. |
| Dosis/frecuencia/vía/duración | Resolver contra opciones. Los personalizados son posibles, pero siempre requieren revisión explícita. |
| Órdenes | Seleccionar opción y código solo desde `clinical_orders_es.json`; si no existe, usar custom sin código porque la UI lo permite. |
| Signos vitales | Parsear valor + unidad + evidencia. Validar límites del contrato. No convertir unidades silenciosamente. |

Para catálogos pequeños no hacen falta embeddings. Coincidencia normalizada, sinónimos y RapidFuzz son más baratos, explicables y fáciles de probar. Embeddings solo se justificarían si la evaluación demuestra que el recall de candidatos es insuficiente.

### 5.6 Esquema del borrador

El resultado necesita más información que el payload final. Cada valor sugerido debería poder llevar:

- valor normalizado;
- fragmento exacto de evidencia del texto desidentificado;
- procedencia: `EXPLICIT`, `DEFAULT`, `DERIVED` o `UNRESOLVED`;
- coincidencia de catálogo: ID/code o `CUSTOM`/`NO_MATCH`;
- advertencias: contradicción, unidad ausente, baja calidad de audio, negación ambigua, truncamiento;
- confirmación requerida.

La «confianza» numérica generada por un LLM no es una probabilidad calibrada. Es preferible derivar niveles de riesgo con señales verificables: calidad ASR, evidencia textual, match exacto o difuso, validación de unidad, contradicciones y criticidad del campo.

## 6. Modelos y servicios de voz a texto

Precios públicos consultados el 18 de noviembre de 2026; pueden cambiar. Los precios no incluyen impuestos, transferencia, almacenamiento, contratos enterprise ni infraestructura auxiliar.

### 6.1 Alternativas

| Alternativa | Español/medicina | Privacidad frente al requisito estricto | Costo público orientativo | Evaluación |
| --- | --- | --- | --- | --- |
| Whisper multilingüe autohospedado con `faster-whisper` | Español general; no especializado clínicamente | Buena si corre en dispositivo o infraestructura exclusiva de Numa | Sin tarifa por minuto; costo de CPU/GPU y operación | **Candidato base recomendado para POC privado.** Hay que medir terminología, números y acento hondureño. |
| Whisper/otro ASR en navegador con Transformers.js/WebGPU | Español según modelo | La frontera más fuerte: el audio puede quedarse en el equipo | API $0; descarga, memoria, batería y soporte | Muy atractivo, pero soporte WebGPU y rendimiento varían. Conviene prototipo, no asumir cobertura universal. |
| Deepgram Nova-3 Medical multilingüe | Modelo especializado, batch y tiempo real, keyterm prompting; el proveedor ofrece managed, VPC y on-prem | API pública no cumple lectura estricta; VPC/on-prem podría cumplir según contrato | Nova-3 multilingual general pregrabado: $0.0052/min; precio Medical/privado requiere cotización | **Principal candidato especializado** para comparar contra Whisper, especialmente medicamentos y términos clínicos. |
| OpenAI `gpt-transcribe` | Multilingüe; acepta keywords y language hints, no es modelo médico dedicado | API pública recibe audio; solo viable bajo interpretación de proveedor autorizado | $0.0045/min; `gpt-live-transcribe` $0.017/min | Muy competitivo en precio y simplicidad, pero no recomendado bajo el requisito estricto. Los modelos antiguos `gpt-4o-*transcribe` están deprecados para nuevas integraciones. |
| Azure AI Speech | Soporta específicamente `es-HN` y Custom Speech | Servicio externo; requiere configuración/contrato apropiados | Precio depende de región y modalidad | **Candidato de benchmark por dialecto hondureño.** No es necesariamente médico, pero el soporte de locale es diferencial. |
| Google Speech-to-Text V2 Chirp 3 | Español y adaptación; modelos médicos solo `en-US` | Servicio externo | $0.016/min estándar; dynamic batch $0.003/min | Útil como benchmark general. No ofrece la ventaja médica en español. |
| AWS Transcribe | Español general; Transcribe Medical solo `en-US` | Servicio externo | Medical equivale a $0.075/min en ejemplos públicos | No recomendado para este caso en español. La versión general podría probarse si la infraestructura ya fuera AWS, pero pierde especialización. |

Fuentes principales:

- [OpenAI: flujo y modelos recomendados de transcripción](https://developers.openai.com/api/docs/guides/transcription), [precios](https://developers.openai.com/api/docs/pricing) y [controles/retención de datos](https://developers.openai.com/api/docs/guides/your-data).
- [Deepgram Nova-3 Medical](https://deepgram.com/solutions/medical), [model options](https://developers.deepgram.com/docs/model) y [precios](https://deepgram.com/pricing).
- [Azure: soporte de idiomas, incluido `es-HN`](https://learn.microsoft.com/en-us/azure/ai-services/Speech-Service/language-support).
- [Google Chirp 3](https://docs.cloud.google.com/speech-to-text/docs/models/chirp-3), [precios](https://cloud.google.com/speech-to-text/pricing) y [modelos médicos solo en inglés](https://docs.cloud.google.com/speech-to-text/docs/v1/medical-models).
- [AWS Transcribe Medical](https://docs.aws.amazon.com/en_en/transcribe/latest/dg/transcribe-medical.html) y [precios](https://aws.amazon.com/transcribe/pricing/).
- [OpenAI Whisper](https://github.com/openai/whisper), [`faster-whisper`](https://github.com/SYSTRAN/faster-whisper) y [Transformers.js/WebGPU](https://huggingface.co/docs/transformers.js/guides/webgpu).

### 6.2 Recomendación de selección de STT

No elegir por una tabla genérica de WER. El conjunto de evaluación debe representar:

- médicos hondureños y variación de acento/velocidad;
- nombres genéricos y comerciales de medicamentos disponibles localmente;
- unidades, decimales, presión arterial, abreviaturas y siglas;
- ruido de consultorio y micrófonos reales;
- dictados desordenados, autocorrecciones y negaciones.

Prueba mínima recomendada:

1. `faster-whisper` con un modelo multilingüe de buena precisión;
2. Deepgram Nova-3 Medical multilingual, preferiblemente en la modalidad de despliegue que satisfaga privacidad;
3. Azure Speech `es-HN` como benchmark dialectal;
4. opcionalmente `gpt-transcribe` como techo comparativo de una API económica, usando solo audio sintético o desidentificado durante la evaluación.

La decisión debe usar error por entidad clínica y por número, no solo WER global. Confundir una preposición tiene menos impacto que cambiar `15 mg` por `50 mg`.

## 7. Modelos para transformar texto en formulario

### 7.1 Qué capacidad se necesita

El problema es extracción estructurada en español con contexto moderado. No requiere búsqueda web, agentes, razonamiento clínico autónomo ni el modelo insignia más caro. Sí requiere:

- JSON Schema estricto;
- arrays anidados para diagnósticos, recetas y órdenes;
- buena comprensión de negaciones, correcciones y referencias cruzadas;
- obediencia a candidatos de catálogo;
- baja latencia y modelo versionable/pinneable;
- disponibilidad bajo controles de retención acordes al tratamiento de texto clínico sensible.

### 7.2 Candidatos

| Modelo/servicio | Precio estándar por 1M tokens de entrada/salida | Fortalezas | Reserva |
| --- | ---: | --- | --- |
| OpenAI GPT-6 Luna | $0.10 / $0.50 | Structured Outputs, muy bajo costo, suficiente en principio para extracción bien acotada | Debe probarse en español clínico; usar solo texto desidentificado y una organización con controles de datos adecuados. |
| OpenAI GPT-6.1 Terra | $1.00 / $5.00 | Mayor capacidad manteniendo costo moderado; Structured Outputs | Diez veces el costo aproximado de Luna. Útil como fallback o comparador, no necesariamente para todas las solicitudes. |
| Google Gemini 3.5 Flash-Lite | $0.30 / $2.50 en Gemini Developer API; precios de Vertex pueden diferir | Salida estructurada y costo bajo | Para datos sensibles debería evaluarse la ruta empresarial de Vertex, no el free tier ni una configuración usada para mejorar productos. |
| LLM autohospedado | Depende de modelo/hardware | Ningún texto sale de la infraestructura controlada | Operación, latencia, actualizaciones y calidad. Debe soportar salida restringida/grammar y superar el mismo set de evaluación. |

Fuentes: [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [GPT-6.1 Terra](https://developers.openai.com/api/docs/models/gpt-6.1-terra), [Structured Outputs de OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs), [precios de Gemini](https://ai.google.dev/gemini-api/docs/pricing) y [salida estructurada de Gemini](https://ai.google.dev/gemini-api/docs/structured-output).

### 7.3 Recomendación de enrutamiento

Probar primero una única llamada a GPT-6 Luna con el esquema completo. Si falla la evaluación:

- no dividir inmediatamente en múltiples agentes;
- mejorar candidatos, esquema y reglas deterministas;
- escalar a Terra solo cuando existan señales de ambigüedad o cuando Luna devuelva un resultado incompleto;
- considerar dos pasos —extraer menciones y luego resolver— únicamente si los resultados demuestran que mejora precisión.

Un pipeline multiagente aumentaría costo, latencia, superficie de fuga y dificultad de auditoría sin una necesidad demostrada.

Un modelo multimodal que reciba audio y produzca directamente el formulario tampoco es recomendable para la primera versión: elimina la barrera de anonimización, dificulta inspeccionar errores de transcripción y ata captura, comprensión y mapeo a un solo proveedor.

## 8. Estimación de costo

### 8.1 Supuesto de comparación

Dictado de cinco minutos, aproximadamente 6,000 tokens de entrada total al LLM —instrucciones, texto y candidatos— y 1,500 tokens de salida estructurada. Es un supuesto conservador para comparar, no una medición del producto.

Costo estimado del mapeo por borrador:

| Modelo | Cálculo | Costo aproximado |
| --- | --- | ---: |
| GPT-6 Luna | 6k × $0.10/M + 1.5k × $0.50/M | $0.00135 |
| GPT-6.1 Terra | 6k × $1/M + 1.5k × $5/M | $0.0135 |
| Gemini 3.5 Flash-Lite | 6k × $0.30/M + 1.5k × $2.50/M | $0.00555 |

Ejemplos de STT + GPT-6 Luna para cinco minutos:

| STT | Costo de voz | Total aproximado con mapeo |
| --- | ---: | ---: |
| OpenAI `gpt-transcribe` | $0.0225 | $0.02385 |
| Deepgram Nova-3 multilingual general pregrabado | $0.0260 | $0.02735; Medical/privado puede diferir |
| Google Speech-to-Text V2 estándar | $0.0800 | $0.08135 |
| AWS Transcribe Medical | $0.3750 | $0.37635, además no aplica a español |

La inferencia de texto no es el principal costo; voz, despliegue privado, soporte y evaluación clínica pesan más.

### 8.2 Costo autohospedado

Para un servidor de STT:

```text
costo por minuto de audio = costo horario de cómputo / (60 × velocidad relativa × utilización)
```

Una GPU ociosa puede ser mucho más cara que una API aunque el costo marginal parezca bajo. Conviene medir:

- tiempo real de transcripción por modelo y hardware;
- concurrencia máxima;
- horas ociosas;
- posibilidad de escalar a cero;
- egress, almacenamiento temporal, observabilidad y operación;
- costo enterprise de un modelo médico privado.

No hay un punto de equilibrio fiable sin volumen esperado y benchmark de hardware. La decisión estricta de privacidad puede justificar autohospedado incluso antes del break-even económico.

## 9. Herramientas y componentes sugeridos

| Necesidad | Opción inicial | Comentario |
| --- | --- | --- |
| Captura | `MediaRecorder` nativo | Evita una dependencia para el MVP. |
| Normalización de audio | FFmpeg en worker | Convierte a PCM/16 kHz cuando el motor lo requiera; nunca registrar comandos con datos sensibles. |
| STT privado | `faster-whisper`/CTranslate2 | Cuantización CPU/GPU y VAD disponibles. Fijar modelo y versión. |
| STT en navegador experimental | Transformers.js + WebGPU | Probar cobertura y rendimiento; fallback explícito, no silencioso, a ruta privada del backend. |
| Desidentificación | Presidio + spaCy/Stanza/transformer español + reconocedores de Honduras | Todo local; agregar reglas para DNI, teléfonos y contexto clínico. Evaluar recall antes de confiar. |
| Coincidencia de catálogos | normalización Unicode + RapidFuzz + sinónimos | No usar embeddings inicialmente. |
| Contrato de salida | Pydantic v2 + JSON Schema/Structured Outputs | Reusar límites y enums del dominio, pero con un esquema de borrador separado del esquema persistente. |
| Worker | proceso dedicado + tabla de jobs en PostgreSQL inicialmente | Evita introducir Redis sin necesidad; diseñar interfaz para migrar a una cola durable. |
| Métricas | OpenTelemetry/Prometheus o stack existente | Solo métricas sin contenido clínico. |
| Evaluación | fixtures JSON versionados y runner reproducible | Casos sintéticos primero; luego corpus autorizado y desidentificado. |

No se recomienda introducir LangChain u otro framework de agentes para el primer alcance. Una interfaz propia `TranscriptionProvider`/`ExtractionProvider`, SDK oficial del proveedor y Pydantic serían más fáciles de auditar y cambiar.

## 10. Seguridad y controles operativos

### 10.1 Datos y retención

- audio en memoria o archivo temporal cifrado, con borrado en éxito, error, cancelación y timeout;
- no guardar audio automáticamente en R2 ni mezclarlo con documentos clínicos;
- no registrar cuerpo multipart, transcripción, prompt, respuesta estructurada ni valores de campos;
- logs permitidos: job ID aleatorio, usuario interno, estado, duración, latencia, proveedor/modelo/version, tokens, costo estimado y código de error sanitizado;
- no usar nombres ni patient ID en trazas hacia servicios externos. Un ID interno puede permanecer solo en la telemetría propia con control de acceso;
- claves de proveedor únicamente en backend/worker y separadas por ambiente;
- expiración corta de jobs y borrado explícito;
- política para respaldos: no introducir contenido temporal que termine en backups de largo plazo.

### 10.2 Proveedores externos

Si se usa un proveedor con texto clínico desidentificado:

- contrato/DPA y, cuando aplique, BAA;
- Zero Data Retention o retención modificada confirmada para **el endpoint y modelo exactos**;
- `store: false` cuando corresponda, sabiendo que esa bandera sola no siempre activa ZDR;
- entrenamiento con datos deshabilitado;
- región y transferencia documentadas;
- lista de subprocesadores revisada;
- sin herramientas web, file search, vector stores ni historial persistente;
- modelo y snapshot fijados cuando sea posible;
- prueba de borrado y respuesta a incidentes.

OpenAI indica que los endpoints de audio y Responses pueden ser elegibles bajo un BAA y configuración correspondiente, pero aceptar un BAA no vuelve conforme la aplicación por sí solo. Véase [funcionalidad elegible para HIPAA](https://help.openai.com/en/articles/20001069-hipaa-eligible-products-and-functionality) y [controles de datos](https://developers.openai.com/api/docs/guides/your-data). Google da una advertencia equivalente sobre su BAA y recomienda no habilitar data logging en Speech-to-Text cuando hay PHI: [guía de HIPAA de Google Cloud](https://docs.cloud.google.com/docs/security/compliance/hipaa).

### 10.3 Autorización y abuso

- el endpoint debe llamar las mismas dependencias de autorización clínica que creación de registros;
- fase inicial solo para `DOCTOR`; asistentes requerirían una decisión y permiso granular explícito;
- rate limit por usuario y por paciente, límite de tamaño/duración y cuota mensual;
- detectar archivo corrupto, audio sin voz y formatos disfrazados;
- no permitir que el LLM llame herramientas ni escriba en base de datos;
- tratar el texto dictado como datos no confiables. Frases del audio que parezcan instrucciones para el modelo no cambian reglas ni esquema;
- idempotencia para evitar trabajos o registros duplicados.

## 11. Experiencia de usuario y seguridad clínica

La interfaz debería comunicar que está creando un borrador, no un registro definitivo:

- botón principal «Dictar registro» con estado de grabación inequívoco;
- transcripción opcional para revisión, local o temporal, con identificadores ya protegidos cuando se muestre;
- progreso por etapas sin revelar contenido en errores;
- campos rellenados por IA destacados hasta que el médico los revise;
- panel compacto de «requiere revisión»;
- evidencia al lado de cada sugerencia, especialmente en dosis, frecuencia, vía, duración, signos vitales, diagnósticos y órdenes;
- confirmación obligatoria de campos críticos antes de habilitar Guardar;
- si existe contenido previo en el formulario, preguntar o mostrar un diff antes de sobrescribir. La política recomendada es combinar solo campos vacíos y presentar conflictos;
- botón «Descartar borrador» que elimine estado local y trabajo temporal;
- edición normal del formulario siempre disponible si el procesamiento falla.

Reglas clínicas de UX:

- no completar un dato que no fue dicho solo porque sea probable;
- los defaults del formulario deben identificarse como defaults;
- conservar negaciones: «sin fiebre» no puede convertirse en «fiebre»;
- manejar correcciones: «presión 120/80, corrijo, 130/85» debe usar el valor corregido y marcar que hubo contradicción;
- no convertir «cinco»/«cincuenta» sin evidencia suficiente;
- mostrar unidades y conversiones;
- no modificar códigos clínicos o medicación basándose en conocimiento general del modelo.

## 12. Evaluación antes de implementar producción

### 12.1 Corpus

Crear un conjunto versionado de dictados sintéticos y, más adelante, audios autorizados/desidentificados:

- 100–300 casos iniciales;
- orden de campos aleatorio;
- campos omitidos;
- varias recetas y órdenes;
- opciones catalogadas y personalizadas;
- sinónimos, siglas y nombres comerciales;
- negaciones, dudas y autocorrecciones;
- unidades y decimales;
- PII sembrada deliberadamente para medir fugas;
- ruido, micrófonos y acentos representativos.

Los casos reales solo deben incorporarse con base legal, consentimiento/política definida, acceso restringido y desidentificación revisada. No usar producción para fine-tuning en la primera etapa.

### 12.2 Métricas

| Capa | Métricas mínimas |
| --- | --- |
| STT | WER y character error rate; error de entidades clínicas; error de números/unidades; omisiones y alucinaciones. |
| PII | recall por tipo, falsos negativos y tasa de bloqueo. En pruebas, cualquier fuga directa es un defecto crítico. |
| Extracción | precisión/recall/F1 por campo; exact match en enums; asociación correcta receta–dosis–frecuencia; contradicciones. |
| Catálogos | recall@k de candidatos; exactitud top-1; tasa de custom correcto; códigos inventados, cuyo objetivo es cero. |
| UX | tiempo ahorrado, correcciones por registro, abandono, tiempo total hasta guardar. |
| Operación | p50/p95 de latencia, errores, reintentos, costo por borrador, tamaño y duración. |

Separar métricas por campo. Un promedio alto puede ocultar errores inaceptables en dosis o signos vitales.

### 12.3 Puertas de decisión

Antes de pasar a un piloto con pacientes reales:

1. el pipeline no envía identificadores sembrados al LLM externo;
2. IDs y códigos de catálogo no pueden salir de un conjunto permitido;
3. campos críticos muestran evidencia y requieren confirmación;
4. audio y contenido temporal se eliminan en todos los caminos de error;
5. autorización `WRITE` se prueba para paciente, rol y recurso;
6. el benchmark con español hondureño alcanza un umbral acordado por médicos;
7. seguridad, privacidad y asesoría jurídica aprueban proveedor, contrato y retención;
8. existe fallback manual sin pérdida de lo escrito.

## 13. Riesgos principales

| Riesgo | Mitigación |
| --- | --- |
| El audio contiene nombre antes de anonimizar | STT local/privado; no usar API pública bajo requisito estricto. |
| El detector omite PII | Capas exactas + reglas + NER + escáner + fail-closed + pruebas adversariales. |
| ASR cambia un número o medicamento | Evidencia, validación de unidad, campos críticos obligatorios, benchmark médico. |
| LLM inventa código/ID | El backend entrega candidatos y valida pertenencia; el modelo nunca genera códigos libres. |
| Mezcla campos de dos recetas | Esquema por entidades, evidencia por subcampo y casos de evaluación múltiples. |
| Sobrescribe trabajo manual | Merge de campos vacíos y diff explícito. |
| Se guarda sin revisión | El resultado es borrador; no reutilizar el endpoint de creación desde el worker. |
| Logs o APM capturan contenido | filtros de telemetría, logging por allowlist y pruebas de ausencia de contenido. |
| Costos inesperados | límites de duración, cuotas, métricas de tokens/minutos y alertas. |
| Dependencia de proveedor | interfaces de provider, schema propio, snapshots y corpus de regresión. |
| Modelo cambia comportamiento | versionado, evaluación previa a actualización y rollout gradual. |

## 14. Recomendaciones priorizadas

1. **Confirmar la interpretación de privacidad.** Si «ningún identificador llega a un modelo externo» es innegociable, descartar desde el inicio transcripción cloud pública.
2. **Hacer un benchmark corto antes del diseño final.** Comparar Whisper privado, Deepgram Medical privado/VPC y Azure `es-HN` con audio sintético hondureño.
3. **Centralizar catálogos de receta en backend.** La IA y la UI deben consumir la misma versión; hoy varias opciones viven solo en TypeScript.
4. **Definir una matriz `closed | catalog+custom | free_text | numeric` por campo.** Esa matriz debe gobernar tanto el prompt como la validación.
5. **Construir desidentificación como componente independiente y probado.** No esconderla dentro del prompt o del proveedor de IA.
6. **Usar salida estructurada y validación estricta.** Empezar por GPT-6 Luna sobre texto desidentificado, con Terra como comparador/fallback.
7. **Mantener humano en el circuito.** La IA rellena un borrador; el médico conserva responsabilidad y control del guardado.
8. **No conservar audio/transcripción por defecto.** Si posteriormente se desea auditoría de audio, tratarlo como una función separada con consentimiento y política de retención.
9. **Medir errores clínicamente ponderados.** El objetivo no es solo WER bajo, sino cero códigos inventados y mínima tasa de error en números/medicamentos.
10. **Postergar ambient scribe.** Dictado individual reduce consentimiento, diarización, ruido, PII y costo; permite validar valor del producto con un riesgo mucho menor.

## 15. Decisiones pendientes para la siguiente iteración

Estas respuestas permitirán convertir el análisis en un plan de implementación:

1. ¿«No compartir con modelos» prohíbe todo proveedor externo o permite texto clínico desidentificado bajo contrato/ZDR?
2. ¿Numa puede operar GPU propia/privada o necesita infraestructura administrada?
3. ¿Volumen esperado de médicos, dictados diarios y duración promedio?
4. ¿Solo dictado del médico o se espera capturar conversación médico–paciente en el futuro?
5. ¿Qué navegadores y equipos son requisito mínimo en consultorios?
6. ¿Debe mostrarse/conservarse una transcripción o solo el borrador estructurado?
7. ¿Qué campos críticos exigirán confirmación individual?
8. ¿Asistentes podrán usarlo en una fase posterior y bajo qué permiso?
9. ¿Qué proveedor cloud, región y contratos ya usa Numa fuera de lo visible en este repositorio?
10. ¿Existe un formulario/catálogo farmacológico de referencia en Honduras que deba incorporarse?

## 16. Propuesta para la próxima iteración

Sin implementar producto todavía:

1. acordar la frontera de privacidad y los proveedores admitidos;
2. fijar 20–30 dictados sintéticos representativos y su salida esperada;
3. ejecutar una prueba comparativa de STT y otra de extracción estructurada;
4. registrar precisión, latencia y costo real;
5. cerrar el esquema de borrador, matriz de campos y política de retención;
6. convertir los resultados en un plan de implementación por fases, con cambios concretos de API, web, infraestructura, migraciones y pruebas.

