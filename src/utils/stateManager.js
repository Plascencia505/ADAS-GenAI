const fs = require('fs/promises');
const path = require('path');
const xss = require('xss');

// Definir ruta absoluta al archivo de estado
const rutaEstado = path.join(__dirname, '../../estado_vehiculo.json');

// Declarar bandera para evitar colisiones de lectura y escritura
let escribiendo = false;

// Purificar de forma recursiva los valores de texto entrantes
function purificarObjeto(obj) {
    const objetoLimpio = Array.isArray(obj) ? [] : {};
    
    for (const [clave, valor] of Object.entries(obj)) {
        if (typeof valor === 'string') {
            objetoLimpio[clave] = xss(valor);
        } else if (typeof valor === 'object' && valor !== null) {
            objetoLimpio[clave] = purificarObjeto(valor);
        } else {
            objetoLimpio[clave] = valor;
        }
    }
    
    return objetoLimpio;
}

// Leer el estado actual del vehículo
async function leerEstado() {
    try {
        const data = await fs.readFile(rutaEstado, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error al leer el estado del vehículo:', error);
        throw new Error('Fallo crítico al acceder a la telemetría');
    }
}

// Actualizar el estado con nuevos parámetros validados
async function actualizarEstado(nuevosParametros) {
    // Retrasar la ejecución si otro proceso está manipulando el archivo
    while (escribiendo) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Bloquear el archivo
    escribiendo = true;

    try {
        const estadoActual = await leerEstado();
        
        // Sanitizar los nuevos datos contra ataques XSS
        const parametrosLimpios = purificarObjeto(nuevosParametros);

        // Crear una copia del estado para no mutar la referencia original
        const estadoActualizado = { ...estadoActual };
        
        // Fusionar las modificaciones manteniendo la estructura de categorías
        for (const [categoria, valores] of Object.entries(parametrosLimpios)) {
            if (estadoActualizado[categoria]) {
                estadoActualizado[categoria] = { 
                    ...estadoActualizado[categoria], 
                    ...valores 
                };
            }
        }

        // Escribir el nuevo estado en formato legible
        await fs.writeFile(rutaEstado, JSON.stringify(estadoActualizado, null, 2), 'utf-8');
        
        return estadoActualizado;
    } catch (error) {
        console.error('Error al actualizar el estado:', error);
        throw error;
    } finally {
        // Liberar el candado de escritura sin importar el resultado
        escribiendo = false;
    }
}

// Exportar módulos para su uso en los controladores
module.exports = {
    leerEstado,
    actualizarEstado
};