import express from 'express';
import authRoutes from "./src/routes/auth.routes.js";
import { authMiddleware } from './src/middleware/auth.middleware.js';
import type { Request, Response } from "express";
import http from 'http';
import { initSocket } from './src/config/socket.js';
import uploadRoutes from './src/routes/upload.routes.js';
import searchRoutes from './src/routes/search.routes.js';
import conversationsRoutes from './src/routes/conversations.routes.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//middleware to parse json
app.use('/auth', authRoutes);
app.use("/upload", uploadRoutes);
app.use("/search", searchRoutes);
app.use("/conversations", conversationsRoutes);

//routes
app.get('/', (req : Request, res : Response) => {
    res.send("Server is running");
});

app.get('/me', authMiddleware, (req : Request, res : Response) => {
    res.json({
        user: req.user
    })
})

const server = http.createServer(app);
initSocket(server);

server.listen(3000, () => {    
    console.log("Server + Socket is running at 3000");
})