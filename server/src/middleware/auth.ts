import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "chain-reaction-secret-key-change-in-production";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    uuid: string;
    email: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      uuid: string;
      email: string;
    };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const generateToken = (payload: {
  userId: string;
  uuid: string;
  email: string;
}) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
};
