import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertPatientSchema, insertMedicineSchema, insertRoomSchema, 
  insertInvoiceSchema, insertInvoiceItemSchema, insertPaymentSchema 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Patients
  app.get("/api/patients", async (req, res) => {
    try {
      const patients = await storage.getPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
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

  app.post("/api/patients", async (req, res) => {
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

  app.get("/api/patients/:id/invoices", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoices = await storage.getPatientInvoices(id);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient invoices" });
    }
  });

  // Medicines
  app.get("/api/medicines", async (req, res) => {
    try {
      const medicines = await storage.getMedicines();
      res.json(medicines);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch medicines" });
    }
  });

  app.get("/api/medicines/low-stock", async (req, res) => {
    try {
      const medicines = await storage.getLowStockMedicines();
      res.json(medicines);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch low stock medicines" });
    }
  });

  app.post("/api/medicines", async (req, res) => {
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

  app.put("/api/medicines/:id", async (req, res) => {
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
  app.get("/api/rooms", async (req, res) => {
    try {
      const rooms = await storage.getRooms();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.get("/api/rooms/occupancy", async (req, res) => {
    try {
      const occupancy = await storage.getRoomOccupancy();
      res.json(occupancy);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch room occupancy" });
    }
  });

  app.post("/api/rooms", async (req, res) => {
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

  app.put("/api/rooms/:id", async (req, res) => {
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
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/outstanding", async (req, res) => {
    try {
      const invoices = await storage.getOutstandingInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch outstanding invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
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

  app.post("/api/invoices", async (req, res) => {
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
  app.get("/api/payments", async (req, res) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", async (req, res) => {
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

  app.get("/api/invoices/:id/payments", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payments = await storage.getInvoicePayments(id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice payments" });
    }
  });

  // Dashboard
  app.get("/api/dashboard/stats", async (req, res) => {
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
