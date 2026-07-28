"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/app.ts
const express_1 = __importDefault(require("express"));
require("express-async-errors");
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const empleados_routes_1 = __importDefault(require("./routes/empleados.routes"));
const productos_routes_1 = __importDefault(require("./routes/productos.routes"));
const ventas_routes_1 = __importDefault(require("./routes/ventas.routes"));
const entregas_routes_1 = __importDefault(require("./routes/entregas.routes"));
const reportes_routes_1 = __importDefault(require("./routes/reportes.routes"));
const devoluciones_routes_1 = __importDefault(require("./routes/devoluciones.routes"));
const ordenes_routes_1 = __importDefault(require("./routes/ordenes.routes"));
const usuarios_routes_1 = __importDefault(require("./routes/usuarios.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const autoconsumo_routes_1 = __importDefault(require("./routes/autoconsumo.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const index_1 = require("./sockets/index");
const initDb_1 = require("./config/initDb");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.set('trust proxy', true); // Confiar en proxies para rate limiter (ej: VS Code Ports, Cloudflare)
const httpServer = (0, http_1.createServer)(app);
// Configurar Socket.IO con CORS adecuado
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: (_origin, callback) => {
            callback(null, true);
        },
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
});
// Middlewares
app.use((req, res, next) => {
    const originalJson = res.json;
    // Obtener el Host de x-forwarded-host (enviado por proxies como VS Code Dev Tunnels) o req.get('host')
    const rawHost = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5000';
    const host = rawHost.split(',')[0].trim(); // X-Forwarded-Host puede venir como lista separada por comas
    const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1');
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const protocol = (isSecure && !isLocalHost) ? 'https' : 'http';
    res.json = function (body) {
        if (body && typeof body === 'object') {
            try {
                let jsonString = JSON.stringify(body);
                // Expresión regular que detecta http(s)://[cualquierhost]/img/ para adaptarlo
                if (jsonString.includes('/img/')) {
                    jsonString = jsonString.replace(/https?:\/\/[^\/]+\/img\//g, `${protocol}://${host}/img/`);
                    body = JSON.parse(jsonString);
                }
            }
            catch (e) {
                // Ignorar
            }
        }
        return originalJson.call(this, body);
    };
    next();
});
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((0, cors_1.default)({
    origin: (_origin, callback) => {
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use('/img', express_1.default.static(path_1.default.join(__dirname, '../img')));
// Configurar Socket.IO
(0, index_1.setupSocket)(io);
// Middleware para adjuntar io a cada request
app.use((req, _res, next) => {
    req.io = io;
    next();
});
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/empleados', empleados_routes_1.default);
app.use('/api/productos', productos_routes_1.default);
app.use('/api/ventas', ventas_routes_1.default);
app.use('/api/entregas', entregas_routes_1.default);
app.use('/api/reportes', reportes_routes_1.default);
app.use('/api/devoluciones', devoluciones_routes_1.default);
app.use('/api/ordenes-compra', ordenes_routes_1.default);
app.use('/api/usuarios', usuarios_routes_1.default);
app.use('/api/admin/crud', admin_routes_1.default);
app.use('/api/upload', upload_routes_1.default);
app.use('/api/autoconsumos', autoconsumo_routes_1.default);
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});
// Error handler
app.use(error_middleware_1.errorHandler);
const PORT = process.env.PORT || 5000;
(0, initDb_1.initDb)().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
        console.log(`📡 WebSocket habilitado en ws://localhost:${PORT}/socket.io`);
    });
});
