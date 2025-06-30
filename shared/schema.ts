import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("doctor"), // admin, doctor
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sessions table for session management
export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 128 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("sessions_user_id_idx").on(table.userId),
  index("sessions_expires_at_idx").on(table.expiresAt),
]);

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  patientId: varchar("patient_id", { length: 50 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const medicines = pgTable("medicines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  buyPrice: decimal("buy_price", { precision: 10, scale: 2 }).notNull().default("0"),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(50),
  unit: varchar("unit", { length: 50 }).notNull().default("units"),
});

// Medical services table for standardized billing items
export const medicalServices = pgTable("medical_services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  defaultPrice: decimal("default_price", { precision: 10, scale: 2 }).notNull().default("0"),
  unit: varchar("unit", { length: 50 }).notNull().default("service"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  roomNumber: varchar("room_number", { length: 20 }).notNull().unique(),
  roomType: varchar("room_type", { length: 50 }).notNull(),
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }).notNull(),
  isOccupied: boolean("is_occupied").notNull().default(false),
  currentPatientId: integer("current_patient_id").references(() => patients.id),
  checkInDate: timestamp("check_in_date"),
  currentInvoiceId: integer("current_invoice_id").references(() => invoices.id),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  subtotalAmount: decimal("subtotal_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  serviceCharge: decimal("service_charge", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, paid, overdue
  dueDate: timestamp("due_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  description: text("description"),
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  itemType: varchar("item_type", { length: 20 }).notNull(), // medicine, room, service
  itemId: integer("item_id"), // references medicine.id or room.id
  itemName: varchar("item_name", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  paymentDate: timestamp("payment_date").defaultNow(),
  reference: varchar("reference", { length: 100 }),
  notes: text("notes"),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // 'payment', 'invoice', 'patient', 'medicine', 'room'
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id),
  relatedId: integer("related_id"), // ID of related record (patient, invoice, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patientDocuments = pgTable("patient_documents", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  documentType: varchar("document_type", { length: 50 }).notNull(), // report, xray, scan, prescription, etc
  documentName: varchar("document_name", { length: 255 }).notNull(),
  documentUrl: varchar("document_url", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
});

export const insertMedicineSchema = createInsertSchema(medicines).omit({
  id: true,
});

export const insertMedicalServiceSchema = createInsertSchema(medicalServices).omit({
  id: true,
  createdAt: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
}).extend({
  dailyRate: z.union([z.string(), z.number()]).transform(val => val.toString()),
  checkInDate: z.union([z.string(), z.null()]).optional().transform(val => 
    val && val !== null ? new Date(val) : null
  ),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
}).extend({
  subtotalAmount: z.string().min(1, "Subtotal amount is required"),
  serviceCharge: z.string().optional(),
  totalAmount: z.string().min(1, "Total amount is required"),
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
  invoiceId: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  paymentDate: true,
});

export const insertPatientDocumentSchema = createInsertSchema(patientDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const updateUserSchema = insertUserSchema.partial().omit({
  passwordHash: true,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

export type Session = typeof sessions.$inferSelect;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Medicine = typeof medicines.$inferSelect;
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;

export type MedicalService = typeof medicalServices.$inferSelect;
export type InsertMedicalService = z.infer<typeof insertMedicalServiceSchema>;

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type PatientDocument = typeof patientDocuments.$inferSelect;
export type InsertPatientDocument = z.infer<typeof insertPatientDocumentSchema>;

// Extended types for API responses
export type InvoiceWithDetails = Invoice & {
  patient: Patient;
  items: InvoiceItem[];
  payments: Payment[];
  paidAmount: number;
  outstandingAmount: number;
};

export type DashboardStats = {
  totalOutstanding: number;
  monthlyRevenue: number;
  pendingInvoices: number;
  lowStockItems: number;
  outstandingChange: number;
  revenueChange: number;
  pendingAmount: number;
  totalProfit: number;
};

export type RoomOccupancy = {
  total: number;
  occupied: number;
  available: number;
  occupancyRate: number;
  roomTypes: {
    name: string;
    occupied: number;
    total: number;
  }[];
};
