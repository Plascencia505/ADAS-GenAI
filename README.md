# 🚗 ADAS GenAI Voice Interface

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini%20AI-4285F4?style=for-the-badge&logo=google-gemini&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**ADAS GenAI** es una interfaz de control vehicular impulsada por Inteligencia Artificial Generativa. Permite a los conductores interactuar con el ecosistema de confort y seguridad del vehículo mediante lenguaje natural, transformando comandos ambiguos en acciones precisas sobre un "Gemelo Digital" en tiempo real.

---

## ✨ Características Principales

* [cite_start]**Comprensión Contextual:** Gracias a Gemini 3.1 Flash Lite, el sistema entiende intenciones como *"hace calor"* o *"la resolana está fuerte"* para actuar sobre el clima o las ventanas.
* **Gemelo Digital (State Management):** Sincronización constante entre un estado JSON persistente y la interfaz visual.
* **Control de Dominio Estricto:** La IA está programada para filtrar peticiones ajenas a la conducción, respondiendo únicamente a necesidades del vehículo.
* **Arquitectura Reactiva:** Comunicación bidireccional mediante WebSockets para actualizaciones de telemetría instantáneas.
* **Seguridad XSS:** Sanitización nativa mediante manipulación del DOM (prohibición de `innerHTML`).

## 🛠️ Stack Tecnológico

| Componente | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Cerebro (LLM)** | Gemini 3.1 Flash Lite | Razonamiento y Function Calling. |
| **Backend** | Node.js & Express | Orquestación y API Server. |
| **Comunicación** | Socket.io | Datos bidireccionales en tiempo real. |
| **Voz (STT)** | Web Speech API | Transcripción nativa en navegador. |
| **Frontend** | HTML5, CSS3, JS Vanilla | Interfaz minimalista y reactiva. |
| **Iconografía** | Font Awesome 7 | Feedback visual dinámico. |

---

## 🏗️ Arquitectura del Sistema

El flujo de datos sigue un ciclo de retroalimentación cerrado:

1.  **Captura:** El usuario emite un comando de voz procesado por el navegador.
2. **Traducción:** El servidor envía la transcripción y el estado actual al modelo Gemini 3.1 Flash Lite.
3.  **Lógica:** El `logicController` procesa las funciones llamadas por la IA (Thinking activo).
4.  **Persistencia:** El `stateManager` actualiza el archivo JSON local.
5.  **Reflejo:** Socket.io emite el nuevo estado a todos los clientes conectados.
