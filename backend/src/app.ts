// backend/src/app.ts
import express from 'express';
import 'express-async-errors';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

import authRoutes from './routes/auth.routes';
import empleadosRoutes from './routes/empleados.routes';
import productosRoutes from './routes/productos.routes';
import ventasRoutes from './routes/ventas.routes';
import entregasRoutes from './routes/entregas.routes';
import reportesRoutes from './routes/reportes.routes';
import devolucionesRoutes from './routes/devoluciones.routes';
import ordenesRoutes from './routes/ordenes.routes';
import usuariosRoutes from './routes/usuarios.routes';
import adminRoutes from './routes/admin.routes';
import uploadRoutes from './routes/upload.routes';
import { errorHandler } from './middleware/error.middleware';
import { setupSocket } from './sockets/index';

dotenv.config();

const app = express();
app.set('trust proxy', true); // Confiar en proxies para rate limiter (ej: VS Code Ports, Cloudflare)

const httpServer = createServer(app);

// Configurar Socket.IO con CORS adecuado
const io = new SocketServer(httpServer, {
  cors: {
    origin: (_origin: any, callback: any) => {
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
  const rawHost = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:5000';
  const host = rawHost.split(',')[0].trim(); // X-Forwarded-Host puede venir como lista separada por comas

  const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1');
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const protocol = (isSecure && !isLocalHost) ? 'https' : 'http';

  res.json = function (this: any, body: any): any {
    if (body && typeof body === 'object') {
      try {
        let jsonString = JSON.stringify(body);
        // Expresión regular que detecta http(s)://[cualquierhost]/img/ para adaptarlo
        if (jsonString.includes('/img/')) {
          jsonString = jsonString.replace(/https?:\/\/[^\/]+\/img\//g, `${protocol}://${host}/img/`);
          body = JSON.parse(jsonString);
        }
      } catch (e) {
        // Ignorar
      }
    }
    return originalJson.call(this, body);
  } as any;

  next();
});
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: (_origin: any, callback: any) => {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use('/img', express.static(path.join(__dirname, '../img')));

// Configurar Socket.IO
setupSocket(io);

// Middleware para adjuntar io a cada request
app.use((req: any, _res: any, next: any) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/entregas', entregasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/devoluciones', devolucionesRoutes);
app.use('/api/ordenes-compra', ordenesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/admin/crud', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📡 WebSocket habilitado en ws://localhost:${PORT}/socket.io`);
});