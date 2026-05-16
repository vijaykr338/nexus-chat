import express from 'express';
import authRoutes from "./src/routes/auth.routes.js";
import { authMiddleware } from './src/middleware/auth.middleware.js';
import type { Request, Response } from "express";
import http from 'http';
import { initSocket } from './src/config/socket.js';
import uploadRoutes from './src/routes/upload.routes.js';
import searchRoutes from './src/routes/search.routes.js';
import conversationsRoutes from './src/routes/conversations.routes.js';
import friendsRoutes from './src/routes/friends.routes.js';
import cors from 'cors';

const PORT = process.env.PORT || 3001;

const app = express();

// Parse CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001', ];

// CORS Configuration
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes with /api prefix
app.use('/api/auth', authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/friends", friendsRoutes);

// Health check routes
app.get('/', (req : Request, res : Response) => {
    res.send("Server is running");
});

app.get('/api/me', authMiddleware, (req : Request, res : Response) => {
    res.json({
        user: req.user
    })
})

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {    
    console.log(`Server + Socket is running at http://localhost:${PORT}`);
})