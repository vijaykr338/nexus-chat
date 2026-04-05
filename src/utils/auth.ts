import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const JWT_SECRET = process.env.JWT_SECRET!;

// hash password
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

// compare password
export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// generate token
export function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

//  verify token
export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { userId: string };
}