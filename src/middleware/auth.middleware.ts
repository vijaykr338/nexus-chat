import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth.js";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try{
         const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ error: "No token" });
    }

    const token = header.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token" });
    }
    //the token needs to exist first 

    const decoded = verifyToken(token);

    (req as any).user = { id: decoded.userId };

    next();
    }catch(error){
        res.status(401).json({ error: "Invalid Token" });
    }
}
