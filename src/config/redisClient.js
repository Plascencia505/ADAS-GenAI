const { createClient } = require('redis');

const redisClient = createClient({
    // Usa la variable de entorno si vas a desplegar en Azure, o localhost para desarrollo
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
    console.error('[REDIS] Error en el servicio de caché:', err.message);
});

redisClient.on('connect', () => {
    console.log('[REDIS] Caché de comandos conectado exitosamente.');
});

// Autoconectar al requerir el módulo
(async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.warn('[REDIS] Fallo en la conexión inicial. El sistema funcionará sin caché.');
    }
})();

module.exports = redisClient;