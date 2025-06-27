import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, CreditCard, X } from "lucide-react";
import { formatCurrency, formatDate, getInitials, getStatusColor } from "@/lib/utils";
import { generateInvoicePDF } from "@/lib/pdf-generator";
import { InvoiceWithDetails } from "@shared/schema";

interface InvoiceModalProps {
  invoice: InvoiceWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onRecordPayment?: () => void;
}

export default function InvoiceModal({ invoice, isOpen, onClose, onRecordPayment }: InvoiceModalProps) {
  const handleDownloadPDF = () => {
    generateInvoicePDF(invoice);
  };

  const getInvoiceStatus = () => {
    if (invoice.outstandingAmount <= 0) return "paid";
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    return dueDate < today ? "overdue" : "pending";
  };

  const status = getInvoiceStatus();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-professional-dark">
                Invoice Details
              </DialogTitle>
              <p className="text-gray-600 mt-1">{invoice.invoiceNumber}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(status)}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X size={16} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-professional-dark mb-3">Invoice Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Number:</span>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Issue Date:</span>
                  <span className="font-medium">{formatDate(invoice.createdAt!)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Due Date:</span>
                  <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                </div>
                {invoice.description && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Description:</span>
                    <span className="font-medium">{invoice.description}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-professional-dark mb-3">Patient Information</h3>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-medical-teal/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-medical-teal">
                    {getInitials(invoice.patient.name)}
                  </span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-professional-dark">{invoice.patient.name}</h4>
                  <p className="text-sm text-gray-600">{invoice.patient.patientId}</p>
                  {invoice.patient.phone && (
                    <p className="text-sm text-gray-600">{invoice.patient.phone}</p>
                  )}
                  {invoice.patient.address && (
                    <p className="text-sm text-gray-600">{invoice.patient.address}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Invoice Items */}
          <div>
            <h3 className="font-semibold text-professional-dark mb-4">Invoice Items</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Description</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Quantity</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Unit Price</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.items.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-professional-dark">{item.itemName}</div>
                        <div className="text-xs text-gray-500 capitalize">{item.itemType}</div>
                      </td>
                      <td className="text-right px-4 py-3 text-sm text-gray-600">{item.quantity}</td>
                      <td className="text-right px-4 py-3 text-sm text-gray-600">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="text-right px-4 py-3 text-sm font-medium text-professional-dark">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-professional-dark mb-4">Payment Summary</h3>
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-medium text-success-green">{formatCurrency(invoice.paidAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Outstanding:</span>
                  <span className={`font-bold ${invoice.outstandingAmount > 0 ? 'text-urgent-red' : 'text-success-green'}`}>
                    {formatCurrency(invoice.outstandingAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div>
              <h3 className="font-semibold text-professional-dark mb-4">Payment History</h3>
              {invoice.payments.length > 0 ? (
                <div className="space-y-3">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-professional-dark">
                          {formatDate(payment.paymentDate!)}
                        </div>
                        <div className="text-xs text-gray-500">{payment.paymentMethod}</div>
                        {payment.reference && (
                          <div className="text-xs text-gray-500">Ref: {payment.reference}</div>
                        )}
                      </div>
                      <div className="text-sm font-medium text-success-green">
                        {formatCurrency(payment.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No payments recorded yet
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="mr-2" size={16} />
              Download PDF
            </Button>
            {invoice.outstandingAmount > 0 && onRecordPayment && (
              <Button onClick={onRecordPayment} className="bg-success-green hover:bg-success-green/90">
                <CreditCard className="mr-2" size={16} />
                Record Payment
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
