const express = require('express');
const { body, validationResult } = require('express-validator');
const { leerEstado, actualizarEstado } = require('../utils/stateManager');
const redisClient = require('../config/redisClient');

const router = express.Router();

// Obtener la telemetría actual vía REST
router.get('/estado', async (req, res) => {
    try {
        const estado = await leerEstado();
        res.json(estado);
    } catch (error) {
        res.status(500).json({ error: 'Error al leer los sensores del vehículo' });
    }
});

// Actualizar parámetros con validación estricta de tipos
router.post('/estado', [
    // Validar parámetros numéricos críticos
    body('entorno_exterior.temperatura_grados').optional().isNumeric(),
    body('climatizacion_hvac.temperatura_objetivo_grados').optional().isNumeric(),
    body('telemetria_marcha.velocidad_kmh').optional().isNumeric(),
    // Validar booleanos
    body('telemetria_marcha.motor_encendido').optional().isBoolean()
], async (req, res) => {

    // Revisar si el middleware detectó anomalías en los tipos de datos
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        // Enviar datos al stateManager para que los purifique con xss y los guarde
        const nuevoEstado = await actualizarEstado(req.body);
        res.json({ mensaje: 'Telemetría actualizada correctamente', estado: nuevoEstado });
    } catch (error) {
        res.status(500).json({ error: 'Fallo crítico al procesar la actualización' });
    }
});

// Inspeccionar todo el contenido actual del caché
router.get('/cache', async (req, res) => {
    try {
        if (!redisClient.isReady) {
            return res.status(503).json({ error: 'Servicio Redis no disponible' });
        }

        // Obtener todas las claves guardadas
        const claves = await redisClient.keys('*');
        const resultados = {};

        // Recuperar y parsear el valor de cada clave
        for (const clave of claves) {
            const valor = await redisClient.get(clave);
            const ttl = await redisClient.ttl(clave);
            resultados[clave] = {
                ttl_segundos: ttl,
                instrucciones: JSON.parse(valor)
            };
        }

        res.json({
            total_comandos_cacheados: claves.length,
            cache: resultados
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar el caché de Redis' });
    }
});

// Exportar enrutador
module.exports = router;