const { leerEstado } = require('../utils/stateManager');

/**
 * Procesar las instrucciones de la IA y aplicarlas al estado actual
 */
async function procesarAcciones(instrucciones) {
    try {
        // Obtener la "fuente de verdad" actual
        const estado = await leerEstado();

        // Iterar sobre cada comando enviado por el LLM
        instrucciones.forEach(instruccion => {
            const { funcion, argumentos } = instruccion;

            switch (funcion) {
                case 'ajustar_climatizacion':
                    // Fusionar solo las propiedades enviadas (temp, hvac, recirculacion)
                    Object.assign(estado.climatizacion_hvac, argumentos);
                    break;

                case 'controlar_ventanas':
                    const { ventana_objetivo, porcentaje_apertura } = argumentos;
                    const vPath = estado.carroceria_accesos.ventanas_porcentaje_apertura;

                    if (ventana_objetivo === 'todas') {
                        // Aplicar el mismo porcentaje a cada posicion del objeto
                        Object.keys(vPath).forEach(v => vPath[v] = porcentaje_apertura);
                    } else if (vPath[ventana_objetivo] !== undefined) {
                        // Modificar solo la ventana especifica (ej. copiloto)
                        vPath[ventana_objetivo] = porcentaje_apertura;
                    }
                    break;

                case 'gestionar_seguros':
                    // Modificar booleano de bloqueo
                    estado.carroceria_accesos.seguros_bloqueados = argumentos.seguros_bloqueados;
                    break;

                case 'controlar_iluminacion':
                    // Actualizar faros o luz de cortesia
                    Object.assign(estado.iluminacion, argumentos);
                    break;

                case 'gestionar_multimedia':
                    // Ajustar volumen, fuente o estado de reproduccion
                    Object.assign(estado.infoentretenimiento, argumentos);
                    break;

                case 'asistir_conductor':
                    // Esta funcion no altera el JSON, se ignora en este controlador
                    break;

                default:
                    console.warn(`Funcion no reconocida por el controlador logico: ${funcion}`);
            }
        });

        return estado;
    } catch (error) {
        console.error('Error al procesar la logica de comandos:', error);
        throw error;
    }
}

module.exports = { procesarAcciones };