const { leerEstado, actualizarEstado } = require('../utils/stateManager');
const { procesarComando } = require('../services/llmService');
const { procesarAcciones } = require('../controllers/logicController');
const { SerialPort } = require('serialport');

// Configuración del enlace físico con el microcontrolador
const puertoSerial = new SerialPort({
    path: 'COM3',
    baudRate: 115200,
    autoOpen: true
});

puertoSerial.on('open', () => {
    console.log('Enlace serial establecido con éxito en el puerto serial.');
});

puertoSerial.on('error', (err) => {
    console.warn('Advertencia del puerto serial (¿ESP32 desconectado?):', err.message);
});

function porcentajeANivel(porcentaje) {
    if (porcentaje >= 75) return 2; // Abierta (100%)
    if (porcentaje >= 25) return 1; // Entreabierta (50%)
    return 0;                       // Cerrada (0%)
}

// Función aislada para empaquetar y transmitir la telemetría al hardware
function sincronizarHardware(estado) {
    try {
        // Coincidencia exacta con el enum unificado ('encendidos' / 'apagados')
        const faros = estado.iluminacion.faros_principales === 'encendidos' ? 1 : 0;

        // Obtener porcentajes individuales de piloto (izquierda) y copiloto (derecha)
        const porcIzquierda = estado.carroceria_accesos.ventanas_porcentaje_apertura.piloto || 0;
        const porcDerecha = estado.carroceria_accesos.ventanas_porcentaje_apertura.copiloto || 0;

        const nivelVI = porcentajeANivel(porcIzquierda);
        const nivelVD = porcentajeANivel(porcDerecha);

        const titulo = estado.infoentretenimiento.titulo_contenido || "Sin contenido";
        const tituloLimpio = titulo.replace(/(\r\n|\n|\r)/gm, " ");

        // Ensamblar trama con VI (Izquierda) y VD (Derecha) independientes
        const tramaDatos = `F:${faros}|VI:${nivelVI}|VD:${nivelVD}|M:${tituloLimpio}\n`;

        // Disparar la trama por el cable USB
        puertoSerial.write(tramaDatos);
        console.log(`[TX SERIAL] Trama física transmitida: ${tramaDatos.trim()}`);

    } catch (error) {
        console.error('Error al empaquetar los datos para el ESP32:', error);
    }
}

// Configurar los eventos del socket
function configurarSockets(io) {
    io.on('connection', async (socket) => {
        console.log(`Dispositivo enlazado al tablero: ${socket.id}`);

        try {
            // Enviar telemetria inicial al conectar
            const estadoInicial = await leerEstado();
            socket.emit('estado_vehiculo', estadoInicial);
            // Sincronizar la maqueta física con el estado de arranque
            sincronizarHardware(estadoInicial);
        } catch (error) {
            console.error('Fallo al recuperar telemetria inicial', error);
        }

        // Escuchar peticiones manuales de sincronizacion
        socket.on('solicitar_estado', async () => {
            try {
                const estado = await leerEstado();
                socket.emit('estado_vehiculo', estado);
            } catch (error) {
                console.error('Error al sincronizar estado manual', error);
            }
        });

        // Interceptar la transcripcion de voz del cliente
        socket.on('comando_voz', async (transcripcion) => {
            console.log(`[AUDIO CAPTURADO] El usuario dijo: "${transcripcion}"`);

            try {
                const estadoActual = await leerEstado();
                const respuestaIA = await procesarComando(transcripcion, estadoActual);

                if (respuestaIA.tipo === 'texto') {
                    socket.emit('notificacion_asistente', respuestaIA.respuesta);
                } else if (respuestaIA.tipo === 'accion') {
                    socket.emit('notificacion_asistente', 'Ejecutando parámetros solicitados...');
                    console.log('Instrucciones recibidas de la IA:', respuestaIA.instrucciones);

                    const estadoCalculado = await procesarAcciones(respuestaIA.instrucciones);
                    const estadoFinal = await actualizarEstado(estadoCalculado);

                    // Sincronizar el tablero web
                    io.emit('estado_vehiculo', estadoFinal);

                    // Sincronizar la maqueta física
                    sincronizarHardware(estadoFinal);

                    const msjVoz = respuestaIA.instrucciones.find(i => i.funcion === 'asistir_conductor');
                    if (msjVoz && msjVoz.argumentos.mensaje_voz) {
                        socket.emit('notificacion_asistente', msjVoz.argumentos.mensaje_voz);
                    }
                }
            } catch (error) {
                console.error('Error al procesar el comando con la IA:', error);
                socket.emit('notificacion_asistente', 'Error de comunicación con el módulo de control.');
            }
        });

        socket.on('disconnect', () => {
            console.log(`Tablero desconectado: ${socket.id}`);
        });
    });
}

module.exports = configurarSockets;