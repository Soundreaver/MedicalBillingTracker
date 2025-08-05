import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { users, sessions, type User, type Session } from "@shared/schema";
import { db } from "./db";
import { eq, and, gt, lt, or } from "drizzle-orm";

const SALT_ROUNDS = 10;

// --- Secure Password Hashing with bcryptjs ---
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Generate session ID
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

export class AuthService {
  // Create default users if they don't exist
  async seedUsers() {
    const existingUsers = await db.select({ username: users.username })
      .from(users)
      .where(or(eq(users.username, 'admin'), eq(users.username, 'dr.sharmin')));

    const existingUsernames = existingUsers.map(u => u.username);

    // Create admin user if it doesn't exist
    if (!existingUsernames.includes('admin')) {
      await db.insert(users).values({
        username: "admin",
        email: "admin@hospital.com",
        passwordHash: await hashPassword("admin123"),
        role: "admin",
        firstName: "System",
        lastName: "Administrator",
        isActive: true,
      });
      console.log('✅ Default admin user created.');
    }

    // Create doctor user if it doesn't exist
    if (!existingUsernames.includes('dr.sharmin')) {
      await db.insert(users).values({
        username: "dr.sharmin",
        email: "sharmin@hospital.com",
        passwordHash: await hashPassword("doctor123"),
        role: "doctor",
        firstName: "Dr. Sharmin",
        lastName: "Afroze",
        isActive: true,
      });
      console.log('✅ Default doctor user created.');
    }
  }

  // Authenticate user
  async authenticate(username: string, password: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    
    if (!user || !user.isActive) {
      return null;
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (passwordMatches) {
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

    const newSession = {
      id: sessionId,
      userId,
      expiresAt,
      createdAt: new Date(),
    };

    await db.insert(sessions).values(newSession);

    return newSession;
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
    const now = new Date();
    const where = userId 
      ? and(eq(sessions.userId, userId), lt(sessions.expiresAt, now))
      : lt(sessions.expiresAt, now);
    
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

    const passwordMatches = await verifyPassword(currentPassword, user.passwordHash);
    if (!passwordMatches) {
      return false;
    }

    await db
      .update(users)
      .set({ 
        passwordHash: await hashPassword(newPassword),
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
