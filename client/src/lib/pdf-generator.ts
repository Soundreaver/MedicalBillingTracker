import jsPDF from "jspdf";
import { InvoiceWithDetails } from "@shared/schema";
import { formatCurrency, formatDate } from "./utils";

export function generateInvoicePDF(invoice: InvoiceWithDetails): void {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(24);
  doc.setTextColor(46, 125, 138); // Medical teal
  doc.text("Mirror Hospital", 20, 30);

  doc.setFontSize(12);
  doc.setTextColor(44, 62, 80); // Professional dark
  doc.text("Hospital Billing Management System", 20, 40);

  // Invoice details
  doc.setFontSize(18);
  doc.text("INVOICE", 20, 60);

  doc.setFontSize(10);
  doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, 75);
  doc.text(`Date: ${formatDate(invoice.createdAt!)}`, 20, 85);
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 20, 95);

  // Patient details
  doc.setFontSize(12);
  doc.text("Bill To:", 20, 115);
  doc.setFontSize(10);
  doc.text(invoice.patient.name, 20, 125);
  doc.text(`Patient ID: ${invoice.patient.patientId}`, 20, 135);
  if (invoice.patient.phone) {
    doc.text(`Phone: ${invoice.patient.phone}`, 20, 145);
  }
  if (invoice.patient.address) {
    doc.text(`Address: ${invoice.patient.address}`, 20, 155);
  }

  // Items table
  const startY = 175;
  doc.setFontSize(10);

  // Table headers
  doc.setFillColor(46, 125, 138);
  doc.setTextColor(255, 255, 255);
  doc.rect(20, startY, 170, 10, "F");
  doc.text("Description", 25, startY + 7);
  doc.text("Qty", 120, startY + 7);
  doc.text("Unit Price", 140, startY + 7);
  doc.text("Total", 170, startY + 7);

  // Table rows
  doc.setTextColor(44, 62, 80);
  let currentY = startY + 15;

  invoice.items.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 250);
      doc.rect(20, currentY - 5, 170, 10, "F");
    }

    doc.text(item.itemName, 25, currentY);
    doc.text(item.quantity.toString(), 120, currentY);
    doc.text(formatCurrency(item.unitPrice), 140, currentY);
    doc.text(formatCurrency(item.totalPrice), 170, currentY);
    currentY += 10;
  });

  // Totals
  const totalY = currentY + 10;
  doc.setFontSize(12);

  doc.text("Subtotal:", 120, totalY);
  doc.text(formatCurrency(invoice.totalAmount), 170, totalY);

  doc.text("Paid Amount:", 120, totalY + 10);
  doc.text(formatCurrency(invoice.paidAmount), 170, totalY + 10);

  doc.setFontSize(14);
  doc.text("Outstanding:", 120, totalY + 20);
  doc.text(formatCurrency(invoice.outstandingAmount), 170, totalY + 20);

  // Payment history
  if (invoice.payments.length > 0) {
    const paymentY = totalY + 40;
    doc.setFontSize(12);
    doc.text("Payment History:", 20, paymentY);

    doc.setFontSize(10);
    invoice.payments.forEach((payment, index) => {
      const y = paymentY + 15 + index * 10;
      doc.text(
        `${formatDate(payment.paymentDate!)} - ${payment.paymentMethod}: ${formatCurrency(payment.amount)}`,
        20,
        y,
      );
    });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text("Thank you for choosing our services!", 20, pageHeight - 30);
  doc.text(
    "For any queries, please contact our billing department.",
    20,
    pageHeight - 20,
  );

  // Save the PDF
  doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
}
