import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_super_secret_key_2026";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
}

export const verifyJwt = (allowedRoles: string[] = ["admin"]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized. Missing or invalid Authorization header." });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;

      // 'master' inherently inherits all admin and editor privileges
      if (decoded.role === "master" || allowedRoles.includes(decoded.role)) {
        return next();
      }

      return res.status(403).json({ error: "Forbidden. Insufficient permissions." });
    } catch (err) {
      return res.status(401).json({ error: "Unauthorized. Invalid or expired token." });
    }
  };
};

export const requireMaster = () => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized. Missing or invalid Authorization header." });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;

      if (decoded.role !== "master") {
        return res.status(403).json({ error: "Forbidden. Master permission is required to edit or delete changelogs." });
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: "Unauthorized. Invalid or expired token." });
    }
  };
};
