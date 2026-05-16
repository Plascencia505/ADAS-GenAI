const { leerEstado } = require('../utils/stateManager');

// Función auxiliar para evitar desbordamientos
function limitarRango(valor, minimo, maximo) {
    return Math.min(Math.max(valor, minimo), maximo);
}

// Procesar las instrucciones de la IA y aplicarlas al estado actual

async function procesarAcciones(instrucciones) {
    try {
        // Obtener la "fuente de verdad" actual
        const estado = await leerEstado();

        // Variable para almacenar la justificación si una regla bloquea la acción
        let mensajeSeguridad = "";

        for (let i = 0; i < instrucciones.length; i++) {
            const instruccion = instrucciones[i];
            const { funcion, argumentos } = instruccion;

            switch (funcion) {
                case 'ajustar_climatizacion':
                    // Límites de HVAC (16°C a 30°C)
                    if (argumentos.temperatura_objetivo_grados !== undefined) {
                        argumentos.temperatura_objetivo_grados = limitarRango(argumentos.temperatura_objetivo_grados, 16, 30);
                    }
                    Object.assign(estado.climatizacion_hvac, argumentos);
                    break;

                case 'controlar_ventanas':
                    let { ventana_objetivo, porcentaje_apertura } = argumentos;
                    const vPath = estado.carroceria_accesos.ventanas_porcentaje_apertura;

                    // Límite de porcentaje (0% a 100%)
                    porcentaje_apertura = limitarRango(porcentaje_apertura, 0, 100);

                    // Blindaje Climático
                    if (estado.entorno_exterior.limpiaparabrisas !== 'apagado' && porcentaje_apertura > 0) {
                        mensajeSeguridad = "He mantenido las ventanas cerradas porque el sensor detecta lluvia exterior.";
                        continue;
                    }

                    // REGLA DE SEGURIDAD 2: Límite de Velocidad
                    if (estado.telemetria_marcha.velocidad_kmh > 80 && porcentaje_apertura > 0) {
                        mensajeSeguridad = "Por tu seguridad, no puedo abrir las ventanas a más de 80 kilómetros por hora.";
                        continue;
                    }

                    // EJECUCIÓN NORMAL
                    if (ventana_objetivo === 'todas') {
                        Object.keys(vPath).forEach(v => vPath[v] = porcentaje_apertura);
                    } else if (vPath[ventana_objetivo] !== undefined) {
                        vPath[ventana_objetivo] = porcentaje_apertura;
                    }

                    // Si logramos abrir alguna ventana exitosamente y el AC estaba prendido, se apaga.
                    if (porcentaje_apertura > 0 && estado.climatizacion_hvac.aire_acondicionado_activo) {
                        estado.climatizacion_hvac.aire_acondicionado_activo = false;

                        if (!mensajeSeguridad) {
                            mensajeSeguridad = "Abriendo ventanas. He apagado el aire acondicionado para ahorrar energía.";
                        }
                    }
                    break;

                case 'gestionar_seguros':
                    const puertaObjetivo = argumentos.puerta_objetivo || 'todas';
                    const bloquear = argumentos.seguros_bloqueados;
                    const sPath = estado.carroceria_accesos.seguros_bloqueados;

                    // Apertura en Movimiento
                    if (estado.telemetria_marcha.velocidad_kmh > 80 && !bloquear) {
                        mensajeSeguridad = "Bloqueo activo: es peligroso quitar los seguros mientras estamos en movimiento.";
                        continue;
                    }

                    // Prevención de Redundancia
                    if (puertaObjetivo === 'todas') {
                        const todasBloqueadas = Object.values(sPath).every(v => v === true);
                        const todasDesbloqueadas = Object.values(sPath).every(v => v === false);

                        if (bloquear && todasBloqueadas) {
                            mensajeSeguridad = "Las puertas ya se encontraban aseguradas.";
                            continue;
                        }
                        if (!bloquear && todasDesbloqueadas) {
                            mensajeSeguridad = "Los seguros ya estaban desactivados.";
                            continue;
                        }
                        Object.keys(sPath).forEach(p => sPath[p] = bloquear);
                    } else if (sPath[puertaObjetivo] !== undefined) {
                        if (sPath[puertaObjetivo] === bloquear) {
                            mensajeSeguridad = `El seguro de la posición ${puertaObjetivo.replace('_', ' ')} ya estaba en ese estado.`;
                            continue;
                        }
                        sPath[puertaObjetivo] = bloquear;
                    }
                    break;

                case 'controlar_iluminacion':
                    Object.assign(estado.iluminacion, argumentos);
                    break;

                case 'gestionar_multimedia':
                    // Límite de volumen (0% a 100%) 
                    if (argumentos.volumen_audio_porcentaje !== undefined) {
                        argumentos.volumen_audio_porcentaje = limitarRango(argumentos.volumen_audio_porcentaje, 0, 100);
                    }
                    Object.assign(estado.infoentretenimiento, argumentos);
                    break;

                case 'asistir_conductor':
                    // Ignorado en la escritura física
                    break;

                case 'rutina_salida_vehiculo':
                    // 1. Desbloquear todas las puertas para permitir la salida física
                    Object.keys(estado.carroceria_accesos.seguros_bloqueados).forEach(p => estado.carroceria_accesos.seguros_bloqueados[p] = false);

                    // 2. Cerrar todas las ventanas de forma segura (0%)
                    Object.keys(estado.carroceria_accesos.ventanas_porcentaje_apertura).forEach(v => estado.carroceria_accesos.ventanas_porcentaje_apertura[v] = 0);

                    // 3. Apagar compresor de clima para no drenar energía
                    estado.climatizacion_hvac.aire_acondicionado_activo = false;

                    // 4. Detener reproducción multimedia
                    estado.infoentretenimiento.multimedia_reproduciendo = false;

                    // Apagar faros y encender luz de cortesía para visibilidad al salir
                    estado.iluminacion.faros_principales = 'apagado';
                    estado.iluminacion.luz_cortesia_encendida = true;

                    // Inyectar el mensaje por defecto si ninguna regla superior falló
                    if (!mensajeSeguridad) mensajeSeguridad = "Sistemas apagados y seguros liberados. Puedes bajar de forma segura.";
                    break;

                case 'rutina_ingreso_vehiculo':
                    // Bloquear todas las puertas por seguridad al prepararse para la marcha
                    Object.keys(estado.carroceria_accesos.seguros_bloqueados).forEach(p => estado.carroceria_accesos.seguros_bloqueados[p] = true);
                    
                    // Encender la luz de cortesía para facilitar la visibilidad en la cabina
                    estado.iluminacion.luz_cortesia_encendida = true;

                    // Forzar el encendido de la climatización para confort inmediato
                    estado.climatizacion_hvac.aire_acondicionado_activo = true;

                    // Reanudar reproducción multimedia para dar la bienvenida
                    estado.infoentretenimiento.multimedia_reproduciendo = true;

                    if (!mensajeSeguridad) mensajeSeguridad = "Bienvenido a bordo. He asegurado las puertas y activado el modo de confort para tu viaje.";
                    break;

                default:
                    console.warn(`Función no reconocida por el controlador lógico: ${funcion}`);
            }
        }

        if (mensajeSeguridad) {
            const indexVoz = instrucciones.findIndex(i => i.funcion === 'asistir_conductor');
            if (indexVoz !== -1) {
                instrucciones[indexVoz].argumentos.mensaje_voz = mensajeSeguridad;
            } else {
                instrucciones.push({
                    funcion: 'asistir_conductor',
                    argumentos: { mensaje_voz: mensajeSeguridad }
                });
            }
        }

        return estado;
    } catch (error) {
        console.error('Error al procesar la lógica de comandos:', error);
        throw error;
    }
}

module.exports = { procesarAcciones };