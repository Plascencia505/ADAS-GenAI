const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inicializar el cliente de Gemini con la API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Definir las herramientas alineadas al esquema JSON del vehiculo
const tools = [
    {
        functionDeclarations: [
            {
                name: "ajustar_climatizacion",
                description: "Modifica el estado del aire acondicionado y la temperatura",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        aire_acondicionado_activo: { type: "BOOLEAN" },
                        temperatura_objetivo_grados: { type: "NUMBER" },
                        recirculacion_activa: { type: "BOOLEAN" }
                    }
                }
            },
            {
                name: "controlar_ventanas",
                description: "Ajusta el porcentaje de apertura de una ventana especifica o todas",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        ventana_objetivo: { 
                            type: "STRING", 
                            enum: ["piloto", "copiloto", "trasera_izquierda", "trasera_derecha", "todas"] 
                        },
                        porcentaje_apertura: { type: "NUMBER" }
                    },
                    required: ["ventana_objetivo", "porcentaje_apertura"]
                }
            },
            {
                name: "gestionar_seguros",
                description: "Bloquea o desbloquea los seguros de las puertas",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        seguros_bloqueados: { type: "BOOLEAN" }
                    },
                    required: ["seguros_bloqueados"]
                }
            },
            {
                name: "controlar_iluminacion",
                description: "Modifica el estado de los faros principales y luces de cortesia",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        faros_principales: { 
                            type: "STRING", 
                            enum: ["apagado", "encendido", "automatico"] 
                        },
                        luz_cortesia_encendida: { type: "BOOLEAN" }
                    }
                }
            },
            {
                name: "gestionar_multimedia",
                description: "Controla la reproduccion de audio, volumen y fuente",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        multimedia_reproduciendo: { type: "BOOLEAN" },
                        volumen_audio_porcentaje: { type: "NUMBER" },
                        fuente_audio: { 
                            type: "STRING", 
                            enum: ["radio", "bluetooth", "usb"] 
                        }
                    }
                }
            },
            {
                name: "asistir_conductor",
                description: "Responde dudas o proporciona feedback amigable al conductor",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        mensaje_voz: { type: "STRING" }
                    },
                    required: ["mensaje_voz"]
                }
            }
        ]
    }
];

// Configurar el modelo con el rol de sistema estricto
// Se utiliza la version estable mas reciente para optimizar latencia
const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    tools: tools,
    systemInstruction: "Eres un copiloto inteligente de un vehiculo ADAS. Tu objetivo es la personalizacion y mejora de la experiencia a bordo. Analiza el estado de los sensores y la peticion del usuario para orquestar acciones que lleguen a su comodidad. Si el usuario pide o pregunta algo que no tenga relacion con el confort, el estado o la conduccion del vehiculo, responde estrictamente con la frase 'No puedo ayudarte con eso' y no llames a ninguna funcion."
});

// Procesar la transcripcion y el estado actual para generar una decision
async function procesarComando(transcripcion, estadoActual) {
    try {
        const chat = model.startChat();
        
        const prompt = `
            Estado actual del vehiculo: ${JSON.stringify(estadoActual)}
            Peticion del conductor: "${transcripcion}"
            ¿Que acciones debo tomar para cumplir con la peticion?
        `;

        const result = await chat.sendMessage(prompt);
        const response = result.response;
        
        const calls = response.functionCalls();
        
        if (calls) {
            return {
                tipo: "accion",
                instrucciones: calls.map(call => ({
                    funcion: call.name,
                    argumentos: call.args
                }))
            };
        }

        return {
            tipo: "texto",
            respuesta: response.text()
        };

    } catch (error) {
        console.error("Error en el servicio LLM:", error);
        throw new Error("No se pudo procesar la peticion con la IA");
    }
}

module.exports = { procesarComando };