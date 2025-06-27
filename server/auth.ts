import crypto from "crypto";
import { users, sessions, type User, type Session } from "@shared/schema";
import { db } from "./db";
import { eq, and, gt, lt } from "drizzle-orm";

// Simple password hashing (in production, use bcrypt)
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'salt').digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Generate session ID
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

export class AuthService {
  // Create default users
  async seedUsers() {
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) return;

    // Create admin user
    await db.insert(users).values({
      username: "admin",
      email: "admin@hospital.com",
      passwordHash: hashPassword("admin123"),
      role: "admin",
      firstName: "System",
      lastName: "Administrator",
      isActive: true,
    });

    // Create doctor user
    await db.insert(users).values({
      username: "dr.sharmin",
      email: "sharmin@hospital.com",
      passwordHash: hashPassword("doctor123"),
      role: "doctor",
      firstName: "Dr. Sharmin",
      lastName: "Afroze",
      isActive: true,
    });
  }

  // Authenticate user
  async authenticate(username: string, password: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    
    if (!user || !user.isActive) {
      return null;
    }

    if (verifyPassword(password, user.passwordHash)) {
      return user;
    }

    return null;
  }

  // Create session
  async createSession(userId: number): Promise<Session> {
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Clean up expired sessions for this user
    await this.cleanupExpiredSessions(userId);

    const [session] = await db.insert(sessions).values({
      id: sessionId,
      userId,
      expiresAt,
    }).returning();

    return session;
  }

  // Get session
  async getSession(sessionId: string): Promise<(Session & { user: User }) | null> {
    const [result] = await db
      .select({
        session: sessions,
        user: users,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.id, sessionId),
          gt(sessions.expiresAt, new Date()),
          eq(users.isActive, true)
        )
      );

    if (!result) return null;

    return {
      ...result.session,
      user: result.user,
    };
  }

  // Delete session
  async deleteSession(sessionId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  // Clean up expired sessions
  async cleanupExpiredSessions(userId?: number): Promise<void> {
    const where = userId 
      ? and(eq(sessions.userId, userId), gt(new Date(), sessions.expiresAt))
      : gt(new Date(), sessions.expiresAt);
    
    await db.delete(sessions).where(where);
  }

  // Get user by ID
  async getUser(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  // Update user
  async updateUser(id: number, updates: Partial<User>): Promise<User | null> {
    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return updated || null;
  }

  // Change password
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return false;
    }

    await db
      .update(users)
      .set({ 
        passwordHash: hashPassword(newPassword),
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));

    return true;
  }

  // Get all users (admin only)
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }
}

export const authService = new AuthService();