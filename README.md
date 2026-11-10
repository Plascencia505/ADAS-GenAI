# 🚗 ADAS GenAI Voice Interface

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini%20AI-4285F4?style=for-the-badge&logo=google-gemini&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**ADAS GenAI** es una interfaz de asistencia y control vehicular inteligente impulsada por Inteligencia Artificial Generativa. Permite a los conductores interactuar con los sistemas de confort, accesos y telemetría del vehículo usando lenguaje natural, transformando comandos de voz ambiguos o compuestos en instrucciones técnicas validadas sobre un gemelo digital y una maqueta física en tiempo real.

---

## ✨ Características Principales

- **Comprensión Contextual y Órdenes Compuestas:** Mediante el modelo Gemini 2.5 Flash, el sistema procesa peticiones directas y desglosa intenciones múltiples en una sola interacción (ej. _"he entrado al vehículo y es de noche"_ activa rutinas de acceso e iluminación simultáneamente mediante llamadas a funciones en paralelo).
- **Caché en Memoria Ultrarrápido con Redis:** Intercepta comandos repetitivos o directos (_"sube el volumen"_, _"enciende los faros"_, _"baja las ventanas"_) para devolver respuestas en sub-milisegundos, reduciendo drásticamente la latencia de red y el consumo innecesario de tokens.
- **Blindaje y Reglas Físicas de Seguridad (`logicController`):** Toda instrucción (provenga de Gemini o del caché) es evaluada contra la telemetría dinámica actual antes de aplicarse:
  - Bloqueo de apertura de ventanas o desactivación de seguros a velocidades superiores a 80 km/h.
  - Bloqueo de apertura de cristales si los limpiaparabrisas detectan lluvia exterior.
  - Apagado automático de climatización (A/C) al abrir cristales para ahorro energético.
  - Discretización estricta de ventanillas a 0%, 50% y 100%.
- **Sincronización Física por Puerto Serial:** Transmisión directa de tramas formateadas a través de UART/COM hacia microcontroladores (ESP32 / Arduino) para accionar actuadores físicos, LEDs y pantallas.
- **Gemelo Digital y Concurrencia Segura (`stateManager`):** Persistencia en JSON local con candados de lectura/escritura atómicos y sanitización XSS recursiva de telemetría.
- **Control de Dominio Estricto:** La IA está instruida para descartar cualquier consulta ajena al vehículo con respuestas prefijadas.

---

## 🛠️ Stack Tecnológico

| Componente                      | Tecnología              | Propósito                                                                       |
| :------------------------------ | :---------------------- | :------------------------------------------------------------------------------ |
| **Cerebro (LLM)**               | Gemini 2.5 Flash        | Razonamiento contextual, despiece de peticiones y Function Calling paralelo.    |
| **Capa de Caché**               | Redis (`node-redis`)    | Almacenamiento clave-valor de instrucciones precalculadas para órdenes comunes. |
| **Backend & Servidor**          | Node.js & Express       | API REST, enrutamiento y orquestación de lógica de negocio.                     |
| **Comunicación en Tiempo Real** | Socket.io               | Enlace bidireccional entre la cabina digital y el servidor.                     |
| **Captura de Voz (STT)**        | Web Speech API          | Transcripción de audio nativa desde el navegador.                               |
| **Frontend**                    | HTML5, CSS3, JS Vanilla | Tablero de instrumentos reactivo y minimalista.                                 |
