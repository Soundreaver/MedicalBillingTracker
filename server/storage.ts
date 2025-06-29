import { 
  patients, medicines, rooms, invoices, invoiceItems, payments, activityLogs, patientDocuments,
  type Patient, type InsertPatient,
  type Medicine, type InsertMedicine,
  type Room, type InsertRoom,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type Payment, type InsertPayment,
  type ActivityLog, type InsertActivityLog,
  type PatientDocument, type InsertPatientDocument,
  type InvoiceWithDetails, type DashboardStats, type RoomOccupancy
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, lt, and, like } from "drizzle-orm";

// Simple currency formatter for server-side use
function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `৳${numAmount.toFixed(2)}`;
}

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
  deleteMedicine(id: number): Promise<void>;
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
  updateInvoiceWithItems(id: number, data: { totalAmount?: string; description?: string; items?: InsertInvoiceItem[] }): Promise<InvoiceWithDetails | undefined>;
  getOutstandingInvoices(): Promise<InvoiceWithDetails[]>;
  getPatientInvoices(patientId: number): Promise<InvoiceWithDetails[]>;

  // Payments
  getPayments(): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  getInvoicePayments(invoiceId: number): Promise<Payment[]>;

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;

  // Activity Logs
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  logActivity(activity: InsertActivityLog): Promise<ActivityLog>;

  // Patient Documents
  getPatientDocuments(patientId: number): Promise<PatientDocument[]>;
  getPatientDocument(id: number): Promise<PatientDocument | undefined>;
  createPatientDocument(document: InsertPatientDocument): Promise<PatientDocument>;
  updatePatientDocument(id: number, document: Partial<InsertPatientDocument>): Promise<PatientDocument | undefined>;
  deletePatientDocument(id: number): Promise<void>;

  // Daily Room Charges
  processDailyRoomCharges(): Promise<{ processed: number; totalCharges: number }>;
  updateRoomCharges(roomId: number): Promise<{ charges: number } | null>;
}

export class DatabaseStorage implements IStorage {


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

  async deleteMedicine(id: number): Promise<void> {
    await db.delete(medicines).where(eq(medicines.id, id));
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
          paidAmount: totalPaid,
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
      paidAmount: totalPaid,
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
    
    // Only insert invoice items if there are any
    if (items.length > 0) {
      const invoiceItemsWithId = items.map(item => ({ ...item, invoiceId: newInvoice.id }));
      await db.insert(invoiceItems).values(invoiceItemsWithId);
    }

    // Update medicine stock for medicine items
    for (const item of items) {
      if (item.itemType === 'medicine' && item.itemId) {
        const [currentMedicine] = await db.select().from(medicines).where(eq(medicines.id, item.itemId));
        if (currentMedicine) {
          const newStock = currentMedicine.stockQuantity - item.quantity;
          await db.update(medicines)
            .set({ stockQuantity: Math.max(0, newStock) })
            .where(eq(medicines.id, item.itemId));
        }
      }
    }

    const result = await this.getInvoice(newInvoice.id);
    if (!result) throw new Error("Failed to create invoice");
    return result;
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set(invoice).where(eq(invoices.id, id)).returning();
    return updated || undefined;
  }

  async updateInvoiceWithItems(id: number, data: { totalAmount?: string; description?: string; items?: InsertInvoiceItem[] }): Promise<InvoiceWithDetails | undefined> {
    // Update the invoice basic info
    const updates: Partial<InsertInvoice> = {};
    if (data.totalAmount) updates.totalAmount = data.totalAmount;
    if (data.description !== undefined) updates.description = data.description;
    
    if (Object.keys(updates).length > 0) {
      await db.update(invoices).set(updates).where(eq(invoices.id, id));
    }

    // If items are provided, replace all existing items
    if (data.items) {
      // First, get original items to restore medicine stock
      const originalItems = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      
      // Restore medicine stock from original items
      for (const item of originalItems) {
        if (item.itemType === 'medicine' && item.itemId) {
          const [currentMedicine] = await db.select().from(medicines).where(eq(medicines.id, item.itemId));
          if (currentMedicine) {
            const restoredStock = currentMedicine.stockQuantity + item.quantity;
            await db.update(medicines)
              .set({ stockQuantity: restoredStock })
              .where(eq(medicines.id, item.itemId));
          }
        }
      }

      // Delete existing items
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

      // Insert new items
      const invoiceItemsWithId = data.items.map(item => ({ ...item, invoiceId: id }));
      await db.insert(invoiceItems).values(invoiceItemsWithId);

      // Update medicine stock for new items
      for (const item of data.items) {
        if (item.itemType === 'medicine' && item.itemId) {
          const [currentMedicine] = await db.select().from(medicines).where(eq(medicines.id, item.itemId));
          if (currentMedicine) {
            const newStock = currentMedicine.stockQuantity - item.quantity;
            await db.update(medicines)
              .set({ stockQuantity: Math.max(0, newStock) })
              .where(eq(medicines.id, item.itemId));
          }
        }
      }
    }

    return this.getInvoice(id);
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
    const allMedicines = await this.getMedicines();
    
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

    // Calculate total profit from medicine sales
    let totalProfit = 0;
    for (const invoice of allInvoices) {
      for (const item of invoice.items) {
        if (item.itemType === 'medicine') {
          const medicine = allMedicines.find(med => med.id === item.itemId);
          if (medicine) {
            const profit = (parseFloat(item.unitPrice) - parseFloat(medicine.buyPrice)) * item.quantity;
            totalProfit += profit;
          }
        }
      }
    }

    return {
      totalOutstanding,
      monthlyRevenue,
      pendingInvoices,
      lowStockItems: lowStockMeds.length,
      outstandingChange: 0, // Placeholder - would need historical data
      revenueChange: 0, // Placeholder - would need historical data
      pendingAmount,
      totalProfit,
    };
  }

  // Activity Log methods
  async getActivityLogs(limit: number = 10): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs)
      .orderBy(sql`${activityLogs.createdAt} DESC`)
      .limit(limit);
  }

  async logActivity(activity: InsertActivityLog): Promise<ActivityLog> {
    const [newActivity] = await db.insert(activityLogs).values(activity).returning();
    return newActivity;
  }

  // Patient Document methods
  async getPatientDocuments(patientId: number): Promise<PatientDocument[]> {
    return await db.select().from(patientDocuments).where(eq(patientDocuments.patientId, patientId));
  }

  async getPatientDocument(id: number): Promise<PatientDocument | undefined> {
    const [document] = await db.select().from(patientDocuments).where(eq(patientDocuments.id, id));
    return document;
  }

  async createPatientDocument(document: InsertPatientDocument): Promise<PatientDocument> {
    const [newDocument] = await db.insert(patientDocuments).values(document).returning();
    return newDocument;
  }

  async updatePatientDocument(id: number, document: Partial<InsertPatientDocument>): Promise<PatientDocument | undefined> {
    const updatedData = { ...document, updatedAt: new Date() };
    const [updatedDocument] = await db.update(patientDocuments)
      .set(updatedData)
      .where(eq(patientDocuments.id, id))
      .returning();
    return updatedDocument;
  }

  async deletePatientDocument(id: number): Promise<void> {
    await db.delete(patientDocuments).where(eq(patientDocuments.id, id));
  }

  async processDailyRoomCharges(): Promise<{ processed: number; totalCharges: number }> {
    // Get all occupied rooms
    const occupiedRooms = await db.select().from(rooms).where(eq(rooms.isOccupied, true));
    
    let processedCount = 0;
    let totalCharges = 0;
    
    for (const room of occupiedRooms) {
      if (!room.currentPatientId || !room.checkInDate) continue;
      
      const result = await this.updateRoomCharges(room.id);
      if (result) {
        processedCount++;
        totalCharges += result.charges;
      }
    }
    
    return { processed: processedCount, totalCharges };
  }

  async updateRoomCharges(roomId: number): Promise<{ charges: number } | null> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
    if (!room || !room.isOccupied || !room.currentPatientId || !room.checkInDate) return null;
    
    // Calculate days since check-in
    const checkInDate = new Date(room.checkInDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // For testing: process even same-day assignments (minimum 1 day charge)
    const chargeDays = Math.max(1, daysDiff);
    
    // Find the room assignment invoice for this patient and room
    const roomInvoices = await db.select()
      .from(invoices)
      .where(
        and(
          eq(invoices.patientId, room.currentPatientId),
          like(invoices.description, `%Room assignment: ${room.roomNumber}%`)
        )
      );
    
    if (roomInvoices.length === 0) return null;
    
    // Use the most recent room assignment invoice
    const invoice = roomInvoices[roomInvoices.length - 1];
    
    // Calculate total room charges that should be on the invoice
    const dailyRate = parseFloat(room.dailyRate);
    const totalRoomCharges = dailyRate * chargeDays;
    
    // Only update if charges have changed
    const currentTotal = parseFloat(invoice.totalAmount);
    if (currentTotal === totalRoomCharges) return null;
    
    // Update the invoice total to include accumulated room charges
    await db.update(invoices)
      .set({ 
        totalAmount: totalRoomCharges.toFixed(2),
        description: `Room assignment: ${room.roomNumber} - ${chargeDays} day(s) @ ${formatCurrency(room.dailyRate)}/day`
      })
      .where(eq(invoices.id, invoice.id));
    
    // Log the activity
    await this.logActivity({
      type: 'room',
      title: `Room charges updated for Room ${room.roomNumber}`,
      description: `Daily room charges processed: ${chargeDays} day(s) = ${formatCurrency(totalRoomCharges.toString())}`,
      relatedId: room.id
    });
    
    return { charges: totalRoomCharges };
  }
}

export const storage = new DatabaseStorage();