"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbQuery = void 0;
// backend/src/config/db.ts
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'test1',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// Probar conexión al iniciar
pool.connect((err, _client, release) => {
    if (err) {
        console.error('❌ Error de conexión a PostgreSQL:', err.message);
    }
    else {
        console.log('✅ Conexión exitosa a la base de datos PostgreSQL:', process.env.DB_NAME || 'test1');
        if (release)
            release();
    }
});
const dbQuery = async (text, params) => {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
        console.log('executed query', { text, duration, rows: res.rowCount });
    }
    return res;
};
exports.dbQuery = dbQuery;
exports.default = pool;
