// Cargar variables de entorno
require('dotenv').config();

// Importar dependencias
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Importar modulos internos
const apiRoutes = require('./src/routes/apiRoutes');
const configurarSockets = require('./src/sockets/eventHandler');

// Inicializar aplicación y servidor
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Configurar middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Registrar rutas del API
app.use('/api', apiRoutes);

// Iniciar manejador de eventos en tiempo real
configurarSockets(io);

// Definir puerto
const PORT = process.env.PORT || 8080;

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`Sistema ADAS iniciado en http://localhost:${PORT}`);
});