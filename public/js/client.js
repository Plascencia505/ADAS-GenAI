const socket = io();

const areaVoz = document.querySelector('.area-voz');
const textoTranscrito = document.getElementById('texto-transcrito');
const listaAcciones = document.getElementById('lista-acciones');
const contenedorEstado = document.getElementById('contenedor-estado');
const ledConexion = document.getElementById('led-conexion');
const ondaAudio = document.getElementById('onda-audio');

let estaGrabando = false;
let recognition;

// Configuración del Motor de Voz
const synth = window.speechSynthesis;
let vozAsistente = null;

// Cargar voces disponibles en el sistema
function cargarVoces() {
    const voces = synth.getVoices();
    // Priorizar español de México, luego cualquier español, o tomar la primera por defecto
    vozAsistente = voces.find(v => v.lang === 'es-MX') ||
        voces.find(v => v.lang.includes('es')) ||
        voces[0];
}

if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = cargarVoces;
}

// Función para emitir la voz del copiloto
function reproducirVoz(texto) {
    if (!synth) return;

    // Cortar cualquier audio previo para que no se encolen los mensajes
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(texto);
    if (vozAsistente) utterance.voice = vozAsistente;

    utterance.lang = 'es-MX';
    utterance.rate = 1.0;  // Velocidad normal
    utterance.pitch = 1.0; // Tono estándar natural

    synth.speak(utterance);
}

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

function renderizarTelemetria(estado) {
    contenedorEstado.textContent = '';

    const { entorno_exterior, climatizacion_hvac, carroceria_accesos, iluminacion, infoentretenimiento } = estado;

    // Datos de Clima y Luces 
    const acActivo = climatizacion_hvac.aire_acondicionado_activo;
    const claseIconoAC = acActivo ? 'fa-solid fa-snowflake icono-activo' : 'fa-solid fa-fan icono-inactivo';
    const textoAC = acActivo ? `Enfriando a ${climatizacion_hvac.temperatura_objetivo_grados}°C` : 'Ventilación apagada';

    const modoFaros = iluminacion.faros_principales;
    const claseIconoLuces = modoFaros === 'apagado' ? 'fa-regular fa-lightbulb icono-inactivo' : 'fa-solid fa-lightbulb icono-activo';
    const textoLuces = `Faros ${modoFaros}`;

    // Datos de Multimedia
    const reproduciendo = infoentretenimiento.multimedia_reproduciendo;
    const volumen = infoentretenimiento.volumen_audio_porcentaje;
    const titulo = infoentretenimiento.titulo_contenido || "Sin contenido";
    const claseIconoMedia = reproduciendo ? 'fa-solid fa-music icono-activo' : 'fa-solid fa-pause icono-inactivo';
    const textoMedia = reproduciendo ? `${titulo} (Vol: ${volumen}%)` : `Pausado - ${titulo}`;

    // Inyectar datos base
    contenedorEstado.appendChild(crearFilaTelemetria('fa-solid fa-cloud-sun icono-activo', 'Exterior', `${entorno_exterior.temperatura_grados}°C`));
    contenedorEstado.appendChild(crearFilaTelemetria(claseIconoAC, 'Climatización', textoAC));
    contenedorEstado.appendChild(crearFilaTelemetria(claseIconoLuces, 'Iluminación', textoLuces));
    contenedorEstado.appendChild(crearFilaTelemetria(claseIconoMedia, 'Multimedia', textoMedia));

    // Sección de Ventanas 
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
    const ordenVentanas = ['piloto', ...Object.keys(ventanas).filter(k => k !== 'piloto')];

    ordenVentanas.forEach(posicion => {
        if (ventanas[posicion] !== undefined) {
            const item = document.createElement('div');
            item.className = posicion === 'piloto' ? 'ventana-item ventana-piloto' : 'ventana-item';

            const textoPosicion = document.createElement('span');
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

    // Sección de Seguros
    const contenedorSeguros = document.createElement('div');
    contenedorSeguros.className = 'dato-telemetria-columna';

    const cabeceraSeguros = crearFilaTelemetria('fa-solid fa-shield-halved icono-activo', 'Seguros', 'Estado por puerta:');
    cabeceraSeguros.style.borderBottom = 'none';
    cabeceraSeguros.style.marginBottom = '0';
    cabeceraSeguros.style.paddingBottom = '0';
    contenedorSeguros.appendChild(cabeceraSeguros);

    const listaSeguros = document.createElement('div');
    listaSeguros.className = 'lista-ventanas';

    const seguros = carroceria_accesos.seguros_bloqueados;
    const ordenSeguros = ['piloto', ...Object.keys(seguros).filter(k => k !== 'piloto')];

    ordenSeguros.forEach(posicion => {
        if (seguros[posicion] !== undefined) {
            const item = document.createElement('div');
            item.className = posicion === 'piloto' ? 'ventana-item ventana-piloto' : 'ventana-item';

            const textoPosicion = document.createElement('span');
            textoPosicion.textContent = posicion.charAt(0).toUpperCase() + posicion.slice(1).replace('_', ' ');

            const contenedorValor = document.createElement('span');
            const iconoSeguro = document.createElement('i');
            iconoSeguro.className = seguros[posicion] ? 'fa-solid fa-lock icono-inactivo' : 'fa-solid fa-lock-open icono-alerta';
            iconoSeguro.style.marginRight = '6px';

            contenedorValor.appendChild(iconoSeguro);
            contenedorValor.appendChild(document.createTextNode(seguros[posicion] ? 'Bloqueado' : 'Desbloqueado'));

            item.appendChild(textoPosicion);
            item.appendChild(contenedorValor);
            listaSeguros.appendChild(item);
        }
    });
    contenedorSeguros.appendChild(listaSeguros);
    contenedorEstado.appendChild(contenedorSeguros);
}

function agregarAccionHistorial(mensajeCrudo) {
    const nuevoElemento = document.createElement('li');
    nuevoElemento.textContent = mensajeCrudo;
    listaAcciones.prepend(nuevoElemento);

    while (listaAcciones.children.length > 4) {
        listaAcciones.removeChild(listaAcciones.lastChild);
    }
}

socket.on('connect', () => {
    ledConexion.classList.replace('led-desconectado', 'led-conectado');
});

socket.on('disconnect', () => {
    ledConexion.classList.replace('led-conectado', 'led-desconectado');
});

socket.on('estado_vehiculo', (estado) => {
    renderizarTelemetria(estado);
});

socket.on('notificacion_asistente', (mensaje) => {
    textoTranscrito.textContent = mensaje;
    agregarAccionHistorial(`Copiloto: ${mensaje}`);

    // Reproducir acústicamente lo que responde la IA
    reproducirVoz(mensaje);
});

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

        ondaAudio.classList.replace('onda-oculta', 'onda-activa');
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

        ondaAudio.classList.replace('onda-activa', 'onda-oculta');
    };

    recognition.onerror = (event) => {
        textoTranscrito.textContent = "Error al capturar audio. Reintenta.";
        estaGrabando = false;
        areaVoz.classList.remove('grabando');
        ondaAudio.classList.replace('onda-activa', 'onda-oculta');
    };

    areaVoz.addEventListener('click', () => {
        // Silenciar al asistente inmediatamente si el usuario presiona el botón
        if (synth && synth.speaking) {
            synth.cancel();
        }

        if (!estaGrabando) {
            try { recognition.start(); } catch (e) { }
        } else {
            recognition.stop();
        }
    });
}