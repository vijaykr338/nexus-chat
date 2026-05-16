import type { Request, Response } from "express";
import {
  searchConversations,
  searchUsers,
} from "../services/search.service.js";

export async function searchUsersController(req: Request, res: Response) {
  try {
    //basically .../search?q=vijay -> everything after ? is query params, and we can have multiple query params like
    // .../search?q=vijay&age=25  here it would come as req.query.q and req.query.age
    const q = (req.query.q as string | undefined)?.trim();

    if (!q) {
      return res.json([]);
    }

    const users = await searchUsers(q);
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function searchConversationsController(
  req: Request,
  res: Response,
) {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    const type = req.query.type === "GROUP" || req.query.type === "DIRECT"
      ? (req.query.type as "GROUP" | "DIRECT")
      : undefined;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!q) {
      return res.json([]);
    }

    const results = await searchConversations(userId, q, type);
    return res.json(results);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}

export async function searchAllController(req: Request, res: Response) {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!q) {
      return res.json({ users: [], conversations: [] });
    }
    //both of them are promises after all, so we can run them in parallel and wait for both 
    // of them to complete using Promise.all
    const [users, conversations] = await Promise.all([
      searchUsers(q),
      searchConversations(userId, q),
    ]);

    return res.json({ users, conversations });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
