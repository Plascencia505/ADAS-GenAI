const { leerEstado, actualizarEstado } = require('../utils/stateManager');
const { procesarComando } = require('../services/llmService');
const { procesarAcciones } = require('../controllers/logicController');

// Configurar los eventos del socket
function configurarSockets(io) {
    io.on('connection', async (socket) => {
        console.log(`Dispositivo enlazado al tablero: ${socket.id}`);

        try {
            // Enviar telemetria inicial al conectar
            const estadoInicial = await leerEstado();
            socket.emit('estado_vehiculo', estadoInicial);
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
                // Leer el contexto actual del vehiculo
                const estadoActual = await leerEstado();
                
                // Enviar transcripcion y telemetria al cerebro IA
                const respuestaIA = await procesarComando(transcripcion, estadoActual);
                
                // Evaluar la decision del modelo
                if (respuestaIA.tipo === 'texto') {
                    // Emitir rechazo o duda tecnica al cliente
                    socket.emit('notificacion_asistente', respuestaIA.respuesta);
                } else if (respuestaIA.tipo === 'accion') {
                    // Notificar inicio de operaciones en la interfaz
                    socket.emit('notificacion_asistente', 'Ejecutando parámetros solicitados...');
                    console.log('Instrucciones recibidas de la IA:', respuestaIA.instrucciones);
                    
                    // Procesar logica y calcular el nuevo estado del vehiculo
                    const estadoCalculado = await procesarAcciones(respuestaIA.instrucciones);
                    
                    // Guardar en disco y aplicar seguridad XSS mediante el guardian
                    const estadoFinal = await actualizarEstado(estadoCalculado);
                    
                    // Sincronizar todos los tableros conectados en tiempo real
                    io.emit('estado_vehiculo', estadoFinal);

                    // Buscar y emitir retroalimentacion de voz si el modelo la incluyo
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

        // Registrar desconexion
        socket.on('disconnect', () => {
            console.log(`Tablero desconectado: ${socket.id}`);
        });
    });
}

// Exportar modulo para inyectarlo en el servidor principal
module.exports = configurarSockets;