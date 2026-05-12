// Inicializar conexion bidireccional
const socket = io();

// Obtener referencias del DOM
const areaVoz = document.querySelector('.area-voz');
const textoTranscrito = document.getElementById('texto-transcrito');
const listaAcciones = document.getElementById('lista-acciones');
const contenedorEstado = document.getElementById('contenedor-estado');

// Declarar variables de estado
let estaGrabando = false;
let recognition;

// Funcion auxiliar para construir nodos del DOM de forma segura
function crearFilaTelemetria(clasesIcono, etiqueta, valorTexto) {
    const contenedorFila = document.createElement('div');
    contenedorFila.className = 'dato-telemetria';

    const icono = document.createElement('i');
    icono.className = clasesIcono;

    const envolturaTexto = document.createElement('span');
    
    const textoNegrita = document.createElement('strong');
    textoNegrita.textContent = `${etiqueta}: `;
    
    envolturaTexto.appendChild(textoNegrita);
    envolturaTexto.appendChild(document.createTextNode(valorTexto));

    contenedorFila.appendChild(icono);
    contenedorFila.appendChild(envolturaTexto);

    return contenedorFila;
}

// Renderizar parametros usando manipulacion segura del DOM
function renderizarTelemetria(estado) {
    contenedorEstado.textContent = '';
    
    const { entorno_exterior, climatizacion_hvac, carroceria_accesos, iluminacion, infoentretenimiento } = estado;

    // Procesar datos estandar
    const acActivo = climatizacion_hvac.aire_acondicionado_activo;
    const claseIconoAC = acActivo ? 'fa-solid fa-snowflake icono-activo' : 'fa-solid fa-fan icono-inactivo';
    const textoAC = acActivo ? `Enfriando a ${climatizacion_hvac.temperatura_objetivo_grados}°C` : 'Ventilación apagada';

    const segurosBloqueados = carroceria_accesos.seguros_bloqueados;
    const claseIconoSeguros = segurosBloqueados ? 'fa-solid fa-lock icono-inactivo' : 'fa-solid fa-lock-open icono-alerta';
    const textoSeguros = segurosBloqueados ? 'Puertas bloqueadas' : 'Puertas desbloqueadas';

    const modoFaros = iluminacion.faros_principales;
    const claseIconoLuces = modoFaros === 'apagado' ? 'fa-regular fa-lightbulb icono-inactivo' : 'fa-solid fa-lightbulb icono-activo';
    const textoLuces = `Faros en modo ${modoFaros}`;

    const reproduciendo = infoentretenimiento.multimedia_reproduciendo;
    const claseIconoMedia = reproduciendo ? 'fa-solid fa-music icono-activo' : 'fa-solid fa-pause icono-inactivo';
    const textoMedia = reproduciendo ? `Volumen al ${infoentretenimiento.volumen_audio_porcentaje}%` : 'Sistema pausado';

    // Inyectar datos estandar
    contenedorEstado.appendChild(crearFilaTelemetria('fa-solid fa-cloud-sun icono-activo', 'Exterior', `${entorno_exterior.temperatura_grados}°C`));
    contenedorEstado.appendChild(crearFilaTelemetria(claseIconoAC, 'Climatización', textoAC));
    contenedorEstado.appendChild(crearFilaTelemetria(claseIconoSeguros, 'Seguridad', textoSeguros));
    contenedorEstado.appendChild(crearFilaTelemetria(claseIconoLuces, 'Iluminación', textoLuces));
    contenedorEstado.appendChild(crearFilaTelemetria(claseIconoMedia, 'Multimedia', textoMedia));

    // Construir estructura jerarquica para las ventanas
    const contenedorVentanas = document.createElement('div');
    contenedorVentanas.className = 'dato-telemetria-columna';

    const cabeceraVentanas = crearFilaTelemetria('fa-solid fa-car-side icono-activo', 'Ventanas', 'Apertura por posición:');
    cabeceraVentanas.style.borderBottom = 'none';
    cabeceraVentanas.style.marginBottom = '0';
    cabeceraVentanas.style.paddingBottom = '0';
    contenedorVentanas.appendChild(cabeceraVentanas);

    const listaVentanas = document.createElement('div');
    listaVentanas.className = 'lista-ventanas';

    const ventanas = carroceria_accesos.ventanas_porcentaje_apertura;
    // Forzar que el piloto sea siempre el primer elemento del arreglo
    const orden = ['piloto', ...Object.keys(ventanas).filter(k => k !== 'piloto')];

    orden.forEach(posicion => {
        if (ventanas[posicion] !== undefined) {
            const item = document.createElement('div');
            item.className = posicion === 'piloto' ? 'ventana-item ventana-piloto' : 'ventana-item';
            
            const textoPosicion = document.createElement('span');
            // Capitalizar texto y remover guiones bajos
            textoPosicion.textContent = posicion.charAt(0).toUpperCase() + posicion.slice(1).replace('_', ' ');
            
            const textoValor = document.createElement('span');
            textoValor.textContent = `${ventanas[posicion]}%`;

            item.appendChild(textoPosicion);
            item.appendChild(textoValor);
            listaVentanas.appendChild(item);
        }
    });

    contenedorVentanas.appendChild(listaVentanas);
    contenedorEstado.appendChild(contenedorVentanas);
}

// Agregar eventos de forma segura al historial
function agregarAccionHistorial(mensajeCrudo) {
    const nuevoElemento = document.createElement('li');
    nuevoElemento.textContent = mensajeCrudo; 
    listaAcciones.prepend(nuevoElemento);
}

// Escuchar eventos de conexion
socket.on('connect', () => {
    agregarAccionHistorial('Conexión establecida con el controlador central.');
});

// Escuchar actualizacion de telemetria
socket.on('estado_vehiculo', (estado) => {
    renderizarTelemetria(estado);
});

// NUEVO: Escuchar respuestas en texto de la IA
socket.on('notificacion_asistente', (mensaje) => {
    textoTranscrito.textContent = mensaje;
    agregarAccionHistorial(`Copiloto: ${mensaje}`);
});

// Configurar API Web Speech
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    textoTranscrito.textContent = "Navegador incompatible con el asistente de voz.";
    areaVoz.style.pointerEvents = 'none';
} else {
    recognition = new SpeechRecognition();
    recognition.lang = 'es-MX';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        estaGrabando = true;
        areaVoz.classList.add('grabando');
        textoTranscrito.textContent = 'Te escucho...';
    };

    recognition.onresult = (event) => {
        const transcripcion = event.results[0][0].transcript;
        textoTranscrito.textContent = `Procesando: "${transcripcion}"`;
        agregarAccionHistorial(`Usuario: ${transcripcion}`);
        socket.emit('comando_voz', transcripcion);
    };

    recognition.onend = () => {
        estaGrabando = false;
        areaVoz.classList.remove('grabando');
    };

    recognition.onerror = (event) => {
        textoTranscrito.textContent = "Error al capturar audio. Reintenta.";
        estaGrabando = false;
        areaVoz.classList.remove('grabando');
    };

    areaVoz.addEventListener('click', () => {
        if (!estaGrabando) {
            try { recognition.start(); } catch (e) {}
        } else {
            recognition.stop();
        }
    });
}