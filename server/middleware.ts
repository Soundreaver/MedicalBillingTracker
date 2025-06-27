import { Request, Response, NextFunction } from "express";
import { authService } from "./auth";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: string;
        firstName?: string;
        lastName?: string;
      };
      sessionId?: string;
    }
  }
}

// Extract session from cookie or header
export function extractSession(req: Request): string | null {
  // Check for session in cookie first
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'session_id') {
        return value;
      }
    }
  }
  
  // Check Authorization header as fallback
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

// Authentication middleware
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const sessionId = extractSession(req);
  
  if (!sessionId) {
    return res.status(401).json({ error: "No session found" });
  }

  try {
    const session = await authService.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    req.user = {
      id: session.user.id,
      username: session.user.username,
      role: session.user.role,
      firstName: session.user.firstName || undefined,
      lastName: session.user.lastName || undefined,
    };
    req.sessionId = sessionId;
    
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

// Role-based authorization middleware
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

// Admin only middleware
export const requireAdmin = requireRole(['admin']);

// Doctor or admin middleware
export const requireDoctorOrAdmin = requireRole(['doctor', 'admin']);