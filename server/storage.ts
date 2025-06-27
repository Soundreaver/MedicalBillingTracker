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

export class MemStorage implements IStorage {
  private patients: Map<number, Patient> = new Map();
  private medicines: Map<number, Medicine> = new Map();
  private rooms: Map<number, Room> = new Map();
  private invoices: Map<number, Invoice> = new Map();
  private invoiceItems: Map<number, InvoiceItem> = new Map();
  private payments: Map<number, Payment> = new Map();
  private currentId = {
    patients: 1,
    medicines: 1,
    rooms: 1,
    invoices: 1,
    invoiceItems: 1,
    payments: 1,
  };

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed patients
    const samplePatients: InsertPatient[] = [
      { name: "Md. Rahman", phone: "01712345678", email: "rahman@example.com", address: "Dhaka, Bangladesh", patientId: "PAT-2024-0123" },
      { name: "Sarah Fatima", phone: "01712345679", email: "sarah@example.com", address: "Chittagong, Bangladesh", patientId: "PAT-2024-0124" },
      { name: "Ahmed Hassan", phone: "01712345680", email: "ahmed@example.com", address: "Sylhet, Bangladesh", patientId: "PAT-2024-0125" },
    ];

    samplePatients.forEach(patient => {
      const id = this.currentId.patients++;
      this.patients.set(id, { ...patient, id, createdAt: new Date() });
    });

    // Seed medicines
    const sampleMedicines: InsertMedicine[] = [
      { name: "Paracetamol 500mg", category: "Pain Relief", unitPrice: "5.50", stockQuantity: 45, lowStockThreshold: 50, unit: "tablets" },
      { name: "Amoxicillin 250mg", category: "Antibiotic", unitPrice: "12.00", stockQuantity: 85, lowStockThreshold: 100, unit: "capsules" },
      { name: "Insulin 100IU/ml", category: "Diabetes", unitPrice: "450.00", stockQuantity: 120, lowStockThreshold: 50, unit: "vials" },
      { name: "Omeprazole 20mg", category: "Gastric", unitPrice: "8.75", stockQuantity: 200, lowStockThreshold: 100, unit: "tablets" },
    ];

    sampleMedicines.forEach(medicine => {
      const id = this.currentId.medicines++;
      this.medicines.set(id, { ...medicine, id });
    });

    // Seed rooms
    const sampleRooms: InsertRoom[] = [
      { roomNumber: "101", roomType: "General Ward", dailyRate: "1500.00", isOccupied: true, currentPatientId: 1 },
      { roomNumber: "102", roomType: "General Ward", dailyRate: "1500.00", isOccupied: false, currentPatientId: null },
      { roomNumber: "201", roomType: "Private Room", dailyRate: "3000.00", isOccupied: true, currentPatientId: 2 },
      { roomNumber: "301", roomType: "ICU", dailyRate: "8000.00", isOccupied: true, currentPatientId: 3 },
    ];

    sampleRooms.forEach(room => {
      const id = this.currentId.rooms++;
      this.rooms.set(id, { ...room, id });
    });
  }

  // Patients
  async getPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async getPatientByPatientId(patientId: string): Promise<Patient | undefined> {
    return Array.from(this.patients.values()).find(p => p.patientId === patientId);
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const id = this.currentId.patients++;
    const newPatient: Patient = { ...patient, id, createdAt: new Date() };
    this.patients.set(id, newPatient);
    return newPatient;
  }

  async updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient | undefined> {
    const existing = this.patients.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patient };
    this.patients.set(id, updated);
    return updated;
  }

  // Medicines
  async getMedicines(): Promise<Medicine[]> {
    return Array.from(this.medicines.values());
  }

  async getMedicine(id: number): Promise<Medicine | undefined> {
    return this.medicines.get(id);
  }

  async createMedicine(medicine: InsertMedicine): Promise<Medicine> {
    const id = this.currentId.medicines++;
    const newMedicine: Medicine = { ...medicine, id };
    this.medicines.set(id, newMedicine);
    return newMedicine;
  }

  async updateMedicine(id: number, medicine: Partial<InsertMedicine>): Promise<Medicine | undefined> {
    const existing = this.medicines.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...medicine };
    this.medicines.set(id, updated);
    return updated;
  }

  async getLowStockMedicines(): Promise<Medicine[]> {
    return Array.from(this.medicines.values()).filter(m => m.stockQuantity <= m.lowStockThreshold);
  }

  // Rooms
  async getRooms(): Promise<Room[]> {
    return Array.from(this.rooms.values());
  }

  async getRoom(id: number): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const id = this.currentId.rooms++;
    const newRoom: Room = { ...room, id };
    this.rooms.set(id, newRoom);
    return newRoom;
  }

  async updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room | undefined> {
    const existing = this.rooms.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...room };
    this.rooms.set(id, updated);
    return updated;
  }

  async getRoomOccupancy(): Promise<RoomOccupancy> {
    const rooms = Array.from(this.rooms.values());
    const total = rooms.length;
    const occupied = rooms.filter(r => r.isOccupied).length;
    const available = total - occupied;
    const occupancyRate = Math.round((occupied / total) * 100);

    const roomTypes = rooms.reduce((acc, room) => {
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
    }, [] as { name: string; occupied: number; total: number }[]);

    return { total, occupied, available, occupancyRate, roomTypes };
  }

  // Invoices
  async getInvoices(): Promise<InvoiceWithDetails[]> {
    const invoices = Array.from(this.invoices.values());
    const result: InvoiceWithDetails[] = [];
    
    for (const invoice of invoices) {
      const patient = this.patients.get(invoice.patientId);
      const items = Array.from(this.invoiceItems.values()).filter(item => item.invoiceId === invoice.id);
      const payments = Array.from(this.payments.values()).filter(payment => payment.invoiceId === invoice.id);
      const outstandingAmount = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);
      
      if (patient) {
        result.push({ ...invoice, patient, items, payments, outstandingAmount });
      }
    }
    
    return result;
  }

  async getInvoice(id: number): Promise<InvoiceWithDetails | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const patient = this.patients.get(invoice.patientId);
    if (!patient) return undefined;
    
    const items = Array.from(this.invoiceItems.values()).filter(item => item.invoiceId === id);
    const payments = Array.from(this.payments.values()).filter(payment => payment.invoiceId === id);
    const outstandingAmount = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);
    
    return { ...invoice, patient, items, payments, outstandingAmount };
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceWithDetails | undefined> {
    const invoice = Array.from(this.invoices.values()).find(inv => inv.invoiceNumber === invoiceNumber);
    if (!invoice) return undefined;
    return this.getInvoice(invoice.id);
  }

  async createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<InvoiceWithDetails> {
    const id = this.currentId.invoices++;
    const newInvoice: Invoice = { 
      ...invoice, 
      id, 
      createdAt: new Date(),
      totalAmount: items.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0).toString()
    };
    this.invoices.set(id, newInvoice);

    const invoiceItems: InvoiceItem[] = [];
    for (const item of items) {
      const itemId = this.currentId.invoiceItems++;
      const newItem: InvoiceItem = { ...item, id: itemId, invoiceId: id };
      this.invoiceItems.set(itemId, newItem);
      invoiceItems.push(newItem);
    }

    const patient = this.patients.get(invoice.patientId)!;
    return { 
      ...newInvoice, 
      patient, 
      items: invoiceItems, 
      payments: [], 
      outstandingAmount: parseFloat(newInvoice.totalAmount) 
    };
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const existing = this.invoices.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...invoice };
    this.invoices.set(id, updated);
    return updated;
  }

  async getOutstandingInvoices(): Promise<InvoiceWithDetails[]> {
    const allInvoices = await this.getInvoices();
    return allInvoices.filter(invoice => invoice.outstandingAmount > 0);
  }

  async getPatientInvoices(patientId: number): Promise<InvoiceWithDetails[]> {
    const allInvoices = await this.getInvoices();
    return allInvoices.filter(invoice => invoice.patientId === patientId);
  }

  // Payments
  async getPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values());
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.currentId.payments++;
    const newPayment: Payment = { ...payment, id, paymentDate: new Date() };
    this.payments.set(id, newPayment);

    // Update invoice paid amount
    const invoice = this.invoices.get(payment.invoiceId);
    if (invoice) {
      const newPaidAmount = parseFloat(invoice.paidAmount) + parseFloat(payment.amount);
      const updatedInvoice = { 
        ...invoice, 
        paidAmount: newPaidAmount.toString(),
        status: newPaidAmount >= parseFloat(invoice.totalAmount) ? "paid" : "pending"
      };
      this.invoices.set(payment.invoiceId, updatedInvoice);
    }

    return newPayment;
  }

  async getInvoicePayments(invoiceId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(payment => payment.invoiceId === invoiceId);
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const invoices = Array.from(this.invoices.values());
    const lowStockMeds = await this.getLowStockMedicines();
    
    const totalOutstanding = invoices.reduce((sum, inv) => {
      return sum + (parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount));
    }, 0);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = invoices
      .filter(inv => inv.createdAt && 
        inv.createdAt.getMonth() === currentMonth && 
        inv.createdAt.getFullYear() === currentYear)
      .reduce((sum, inv) => sum + parseFloat(inv.paidAmount), 0);

    const pendingInvoices = invoices.filter(inv => inv.status === "pending").length;
    const pendingAmount = invoices
      .filter(inv => inv.status === "pending")
      .reduce((sum, inv) => sum + (parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount)), 0);

    const criticalItems = lowStockMeds.filter(med => med.stockQuantity <= 10).length;

    return {
      totalOutstanding,
      monthlyRevenue,
      pendingInvoices,
      lowStockItems: lowStockMeds.length,
      outstandingChange: 12, // Mock percentage change
      revenueChange: 8, // Mock percentage change
      pendingAmount,
      criticalItems,
    };
  }
}

export const storage = new MemStorage();
