import { 
  patients, medicines, rooms, invoices, invoiceItems, payments,
  type Patient, type InsertPatient,
  type Medicine, type InsertMedicine,
  type Room, type InsertRoom,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type Payment, type InsertPayment,
  type InvoiceWithDetails, type DashboardStats, type RoomOccupancy
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, lt } from "drizzle-orm";

export interface IStorage {
  // Patients
  getPatients(): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientByPatientId(patientId: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient | undefined>;

  // Medicines
  getMedicines(): Promise<Medicine[]>;
  getMedicine(id: number): Promise<Medicine | undefined>;
  createMedicine(medicine: InsertMedicine): Promise<Medicine>;
  updateMedicine(id: number, medicine: Partial<InsertMedicine>): Promise<Medicine | undefined>;
  getLowStockMedicines(): Promise<Medicine[]>;

  // Rooms
  getRooms(): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room | undefined>;
  getRoomOccupancy(): Promise<RoomOccupancy>;

  // Invoices
  getInvoices(): Promise<InvoiceWithDetails[]>;
  getInvoice(id: number): Promise<InvoiceWithDetails | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceWithDetails | undefined>;
  createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<InvoiceWithDetails>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  getOutstandingInvoices(): Promise<InvoiceWithDetails[]>;
  getPatientInvoices(patientId: number): Promise<InvoiceWithDetails[]>;

  // Payments
  getPayments(): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  getInvoicePayments(invoiceId: number): Promise<Payment[]>;

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  async seedData() {
    // Check if data already exists
    const existingPatients = await db.select().from(patients).limit(1);
    if (existingPatients.length > 0) return;

    // Seed patients
    const samplePatients: InsertPatient[] = [
      { name: "Md. Rahman", phone: "01712345678", email: "rahman@example.com", address: "Dhaka, Bangladesh", patientId: "PAT-2024-0123" },
      { name: "Sarah Fatima", phone: "01712345679", email: "sarah@example.com", address: "Chittagong, Bangladesh", patientId: "PAT-2024-0124" },
      { name: "Ahmed Hassan", phone: "01712345680", email: "ahmed@example.com", address: "Sylhet, Bangladesh", patientId: "PAT-2024-0125" },
    ];

    await db.insert(patients).values(samplePatients);

    // Seed medicines
    const sampleMedicines: InsertMedicine[] = [
      { name: "Paracetamol 500mg", category: "Pain Relief", unitPrice: "5.50", stockQuantity: 45, lowStockThreshold: 50, unit: "tablets" },
      { name: "Amoxicillin 250mg", category: "Antibiotic", unitPrice: "12.00", stockQuantity: 85, lowStockThreshold: 100, unit: "capsules" },
      { name: "Insulin 100IU/ml", category: "Diabetes", unitPrice: "450.00", stockQuantity: 120, lowStockThreshold: 50, unit: "vials" },
      { name: "Omeprazole 20mg", category: "Gastric", unitPrice: "8.75", stockQuantity: 200, lowStockThreshold: 100, unit: "tablets" },
    ];

    await db.insert(medicines).values(sampleMedicines);

    // Seed rooms
    const sampleRooms: InsertRoom[] = [
      { roomNumber: "101", roomType: "General Ward", dailyRate: "1500.00", isOccupied: true, currentPatientId: 1 },
      { roomNumber: "102", roomType: "General Ward", dailyRate: "1500.00", isOccupied: false, currentPatientId: null },
      { roomNumber: "201", roomType: "Private Room", dailyRate: "3000.00", isOccupied: true, currentPatientId: 2 },
      { roomNumber: "301", roomType: "ICU", dailyRate: "8000.00", isOccupied: true, currentPatientId: 3 },
    ];

    await db.insert(rooms).values(sampleRooms);
  }

  // Patient methods
  async getPatients(): Promise<Patient[]> {
    return await db.select().from(patients);
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async getPatientByPatientId(patientId: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.patientId, patientId));
    return patient || undefined;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [newPatient] = await db.insert(patients).values(patient).returning();
    return newPatient;
  }

  async updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [updated] = await db.update(patients).set(patient).where(eq(patients.id, id)).returning();
    return updated || undefined;
  }

  // Medicine methods
  async getMedicines(): Promise<Medicine[]> {
    return await db.select().from(medicines);
  }

  async getMedicine(id: number): Promise<Medicine | undefined> {
    const [medicine] = await db.select().from(medicines).where(eq(medicines.id, id));
    return medicine || undefined;
  }

  async createMedicine(medicine: InsertMedicine): Promise<Medicine> {
    const [newMedicine] = await db.insert(medicines).values(medicine).returning();
    return newMedicine;
  }

  async updateMedicine(id: number, medicine: Partial<InsertMedicine>): Promise<Medicine | undefined> {
    const [updated] = await db.update(medicines).set(medicine).where(eq(medicines.id, id)).returning();
    return updated || undefined;
  }

  async getLowStockMedicines(): Promise<Medicine[]> {
    return await db.select().from(medicines).where(sql`${medicines.stockQuantity} <= ${medicines.lowStockThreshold}`);
  }

  // Room methods
  async getRooms(): Promise<Room[]> {
    return await db.select().from(rooms);
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room || undefined;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room | undefined> {
    const [updated] = await db.update(rooms).set(room).where(eq(rooms.id, id)).returning();
    return updated || undefined;
  }

  async getRoomOccupancy(): Promise<RoomOccupancy> {
    const allRooms = await db.select().from(rooms);
    const total = allRooms.length;
    const occupied = allRooms.filter(room => room.isOccupied).length;
    const available = total - occupied;
    const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;

    const roomTypes = allRooms.reduce((acc, room) => {
      const existing = acc.find(rt => rt.name === room.roomType);
      if (existing) {
        existing.total++;
        if (room.isOccupied) existing.occupied++;
      } else {
        acc.push({
          name: room.roomType,
          occupied: room.isOccupied ? 1 : 0,
          total: 1,
        });
      }
      return acc;
    }, [] as { name: string; occupied: number; total: number; }[]);

    return { total, occupied, available, occupancyRate, roomTypes };
  }

  // Invoice methods
  async getInvoices(): Promise<InvoiceWithDetails[]> {
    const allInvoices = await db.select().from(invoices);
    const result: InvoiceWithDetails[] = [];

    for (const invoice of allInvoices) {
      const patient = await this.getPatient(invoice.patientId);
      const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
      const paymentsList = await this.getInvoicePayments(invoice.id);
      
      const totalPaid = paymentsList.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
      const outstandingAmount = parseFloat(invoice.totalAmount) - totalPaid;

      if (patient) {
        result.push({
          ...invoice,
          patient,
          items,
          payments: paymentsList,
          outstandingAmount,
        });
      }
    }

    return result;
  }

  async getInvoice(id: number): Promise<InvoiceWithDetails | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) return undefined;

    const patient = await this.getPatient(invoice.patientId);
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
    const paymentsList = await this.getInvoicePayments(invoice.id);
    
    const totalPaid = paymentsList.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const outstandingAmount = parseFloat(invoice.totalAmount) - totalPaid;

    if (!patient) return undefined;

    return {
      ...invoice,
      patient,
      items,
      payments: paymentsList,
      outstandingAmount,
    };
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceWithDetails | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber));
    if (!invoice) return undefined;
    return this.getInvoice(invoice.id);
  }

  async createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<InvoiceWithDetails> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    
    const invoiceItemsWithId = items.map(item => ({ ...item, invoiceId: newInvoice.id }));
    await db.insert(invoiceItems).values(invoiceItemsWithId);

    const result = await this.getInvoice(newInvoice.id);
    if (!result) throw new Error("Failed to create invoice");
    return result;
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set(invoice).where(eq(invoices.id, id)).returning();
    return updated || undefined;
  }

  async getOutstandingInvoices(): Promise<InvoiceWithDetails[]> {
    const allInvoices = await this.getInvoices();
    return allInvoices.filter(invoice => invoice.outstandingAmount > 0);
  }

  async getPatientInvoices(patientId: number): Promise<InvoiceWithDetails[]> {
    const allInvoices = await this.getInvoices();
    return allInvoices.filter(invoice => invoice.patientId === patientId);
  }

  // Payment methods
  async getPayments(): Promise<Payment[]> {
    return await db.select().from(payments);
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async getInvoicePayments(invoiceId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.invoiceId, invoiceId));
  }

  // Dashboard methods
  async getDashboardStats(): Promise<DashboardStats> {
    const allInvoices = await this.getInvoices();
    const lowStockMeds = await this.getLowStockMedicines();
    
    const totalOutstanding = allInvoices.reduce((sum, inv) => sum + inv.outstandingAmount, 0);
    const pendingInvoices = allInvoices.filter(inv => inv.outstandingAmount > 0).length;
    const pendingAmount = totalOutstanding;
    
    // Calculate monthly revenue (current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = allInvoices
      .filter(inv => {
        const invDate = new Date(inv.createdAt || '');
        return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
      })
      .reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

    return {
      totalOutstanding,
      monthlyRevenue,
      pendingInvoices,
      lowStockItems: lowStockMeds.length,
      outstandingChange: 0, // Placeholder - would need historical data
      revenueChange: 0, // Placeholder - would need historical data
      pendingAmount,
      criticalItems: lowStockMeds.filter(med => med.stockQuantity <= 10).length,
    };
  }
}

export const storage = new DatabaseStorage();