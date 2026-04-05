import type { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service.js";

export async function register(req: Request, res: Response){
    try{
        const { username, email, password } = req.body;
        const { user, token } = await registerUser(username, email, password);
        res.status(201).json({ user, token });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
}

export async function login(req: Request, res: Response){
    try{
        const { email, password } = req.body;
        const { user, token } = await loginUser(email, password);
        res.status(200).json({ user, token });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
}