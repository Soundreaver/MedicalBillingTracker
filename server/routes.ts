import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authService } from "./auth";
import { authenticate, requireAdmin, requireDoctorOrAdmin } from "./middleware";
import { 
  insertPatientSchema, insertMedicineSchema, insertRoomSchema, 
  insertInvoiceSchema, insertInvoiceItemSchema, insertPaymentSchema,
  loginSchema, updateUserSchema, changePasswordSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Seed database on startup
  await storage.seedData();
  await authService.seedUsers();

  // Authentication routes (public)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await authService.authenticate(username, password);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const session = await authService.createSession(user.id);
      
      // Set session cookie
      res.cookie('session_id', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
      });

      res.json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ error: "Invalid login data" });
    }
  });

  app.post("/api/auth/logout", authenticate, async (req, res) => {
    try {
      if (req.sessionId) {
        await authService.deleteSession(req.sessionId);
      }
      res.clearCookie('session_id');
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req, res) => {
    res.json({ user: req.user });
  });

  // User management routes
  app.get("/api/users", authenticate, requireAdmin, async (req, res) => {
    try {
      const users = await authService.getAllUsers();
      // Remove password hashes from response
      const safeUsers = users.map(({ passwordHash, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.put("/api/users/:id", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Users can only update their own profile unless they're admin
      if (req.user!.id !== userId && req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updates = updateUserSchema.parse(req.body);
      const user = await authService.updateUser(userId, updates);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.post("/api/users/:id/change-password", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Users can only change their own password unless they're admin
      if (req.user!.id !== userId && req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const success = await authService.changePassword(userId, currentPassword, newPassword);
      
      if (!success) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(400).json({ error: "Invalid password data" });
    }
  });
  // Patients (require authentication)
  app.get("/api/patients", authenticate, async (req, res) => {
    try {
      const patients = await storage.getPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const patient = await storage.getPatient(id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  app.post("/api/patients", authenticate, requireDoctorOrAdmin, async (req, res) => {
    try {
      const result = insertPatientSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid patient data", errors: result.error.errors });
      }
      const patient = await storage.createPatient(result.data);
      res.status(201).json(patient);
    } catch (error) {
      res.status(500).json({ message: "Failed to create patient" });
    }
  });

  app.get("/api/patients/:id/invoices", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoices = await storage.getPatientInvoices(id);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient invoices" });
    }
  });

  // Medicines
  app.get("/api/medicines", authenticate, async (req, res) => {
    try {
      const medicines = await storage.getMedicines();
      res.json(medicines);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch medicines" });
    }
  });

  app.get("/api/medicines/low-stock", authenticate, async (req, res) => {
    try {
      const medicines = await storage.getLowStockMedicines();
      res.json(medicines);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch low stock medicines" });
    }
  });

  app.post("/api/medicines", authenticate, requireDoctorOrAdmin, async (req, res) => {
    try {
      const result = insertMedicineSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid medicine data", errors: result.error.errors });
      }
      const medicine = await storage.createMedicine(result.data);
      res.status(201).json(medicine);
    } catch (error) {
      res.status(500).json({ message: "Failed to create medicine" });
    }
  });

  app.put("/api/medicines/:id", authenticate, requireDoctorOrAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertMedicineSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid medicine data", errors: result.error.errors });
      }
      const medicine = await storage.updateMedicine(id, result.data);
      if (!medicine) {
        return res.status(404).json({ message: "Medicine not found" });
      }
      res.json(medicine);
    } catch (error) {
      res.status(500).json({ message: "Failed to update medicine" });
    }
  });

  // Rooms
  app.get("/api/rooms", authenticate, async (req, res) => {
    try {
      const rooms = await storage.getRooms();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.get("/api/rooms/occupancy", authenticate, async (req, res) => {
    try {
      const occupancy = await storage.getRoomOccupancy();
      res.json(occupancy);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch room occupancy" });
    }
  });

  app.post("/api/rooms", authenticate, requireAdmin, async (req, res) => {
    try {
      const result = insertRoomSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid room data", errors: result.error.errors });
      }
      const room = await storage.createRoom(result.data);
      res.status(201).json(room);
    } catch (error) {
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.put("/api/rooms/:id", authenticate, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertRoomSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid room data", errors: result.error.errors });
      }
      const room = await storage.updateRoom(id, result.data);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  // Invoices
  app.get("/api/invoices", authenticate, async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/outstanding", authenticate, async (req, res) => {
    try {
      const invoices = await storage.getOutstandingInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch outstanding invoices" });
    }
  });

  app.get("/api/invoices/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  const createInvoiceSchema = z.object({
    invoice: insertInvoiceSchema,
    items: z.array(insertInvoiceItemSchema),
  });

  app.post("/api/invoices", authenticate, requireDoctorOrAdmin, async (req, res) => {
    try {
      const result = createInvoiceSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid invoice data", errors: result.error.errors });
      }
      const invoice = await storage.createInvoice(result.data.invoice, result.data.items);
      res.status(201).json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Payments
  app.get("/api/payments", authenticate, async (req, res) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", authenticate, requireDoctorOrAdmin, async (req, res) => {
    try {
      const result = insertPaymentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid payment data", errors: result.error.errors });
      }
      const payment = await storage.createPayment(result.data);
      res.status(201).json(payment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  app.get("/api/invoices/:id/payments", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payments = await storage.getInvoicePayments(id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice payments" });
    }
  });

  // Dashboard
  app.get("/api/dashboard/stats", authenticate, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
