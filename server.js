const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let precioSubasta = 100000;

let ofertas = {}; // Almacenar ofertas de los usuarios

let tiempoRestante = 30;  // Cambiar a 2 minutos (2 minutos x 60 segundos)
let tiempoInterval;  // Variable para almacenar el intervalo del tiempo
let subastaActiva = false;  // Variable para controlar si la subasta está activa

function iniciarSubasta() {
    tiempoInterval = setInterval(() => {
        tiempoRestante--;

        if (tiempoRestante <= 0) {
            finalizarSubasta();
        } else {
            io.emit('tiempoRestante', tiempoRestante);
        }
    }, 1000);
}

function finalizarSubasta() {
    clearInterval(tiempoInterval);  // Limpiar el intervalo del tiempo
    const ganador = obtenerGanador();
    
    if (ganador && ganador.ganador) {
        io.emit('subastaFinalizada', { ganador });
    } else {
        io.emit('subastaFinalizada', { mensaje: "Subasta finalizada. Nadie ofertó." });
    }

    // Reiniciar valores
    tiempoRestante = 30;
    subastaActiva = false;
}

function obtenerGanador() {
    let ganador = null;
    let precioGanador = 0;

    for (const usuario in ofertas) {
        const ofertaUsuario = ofertas[usuario];
        if (ofertaUsuario > precioGanador) {
            precioGanador = ofertaUsuario;
            ganador = usuario;
        }
    }

    return { ganador, precio: precioGanador };
}

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('oferta', (data) => {
        const usuario = data.usuario;

        if (!ofertas[usuario]) {
            ofertas[usuario] = data.oferta;

            if (data.oferta > precioSubasta) {
                precioSubasta = data.oferta;
                io.emit('valorActual', precioSubasta);
                tiempoRestante = 30;  // Reiniciar el tiempo
            }
        }
    });

    socket.on('iniciarSubasta', () => {
        if (!subastaActiva) {
            subastaActiva = true;
            iniciarSubasta();
        }
    });
});

app.use(express.static('public'));

app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io/client-dist'));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Servidor en ejecución en http://localhost:${PORT}`);
});
