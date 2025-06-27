import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, CreditCard, Download, Search } from "lucide-react";
import { formatCurrency, formatDate, getInitials, getDaysOverdue, getStatusColor } from "@/lib/utils";
import { generateInvoicePDF } from "@/lib/pdf-generator";
import { InvoiceWithDetails } from "@shared/schema";
import InvoiceModal from "./modals/invoice-modal";
import PaymentModal from "./modals/payment-modal";

export default function OutstandingInvoicesTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: invoices = [], isLoading } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices/outstanding"],
  });

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewInvoice = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handleRecordPayment = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleDownloadPDF = (invoice: InvoiceWithDetails) => {
    generateInvoicePDF(invoice);
  };

  const getInvoiceStatus = (invoice: InvoiceWithDetails) => {
    if (invoice.outstandingAmount <= 0) return "paid";
    const daysOverdue = getDaysOverdue(invoice.dueDate);
    return daysOverdue > 0 ? "overdue" : "pending";
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <>
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-professional-dark">Outstanding Invoices</h3>
              <p className="text-gray-600 mt-1">Invoices pending payment</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Services</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => {
                  const status = getInvoiceStatus(invoice);
                  const daysOverdue = getDaysOverdue(invoice.dueDate);
                  
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-professional-dark">{invoice.invoiceNumber}</div>
                        <div className="text-sm text-gray-500">{formatDate(invoice.createdAt!)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-medical-teal/10 rounded-full flex items-center justify-center mr-3">
                            <span className="text-xs font-medium text-medical-teal">
                              {getInitials(invoice.patient.name)}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-professional-dark">{invoice.patient.name}</div>
                            <div className="text-sm text-gray-500">{invoice.patient.patientId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-professional-dark">
                          {invoice.items.map(item => item.itemName).join(", ")}
                        </div>
                        <div className="text-sm text-gray-500">{invoice.items.length} items</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-professional-dark">
                          {formatCurrency(invoice.totalAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${status === 'overdue' ? 'text-urgent-red' : 'text-gray-600'}`}>
                          {formatDate(invoice.dueDate)}
                        </div>
                        {status === 'overdue' && (
                          <div className="text-sm text-gray-500">{daysOverdue} days overdue</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusColor(status)}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewInvoice(invoice)}
                            className="text-medical-teal hover:text-soft-blue"
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRecordPayment(invoice)}
                            className="text-success-green hover:text-green-700"
                          >
                            <CreditCard size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadPDF(invoice)}
                            className="text-soft-blue hover:text-blue-700"
                          >
                            <Download size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredInvoices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No outstanding invoices found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedInvoice && (
        <>
          <InvoiceModal
            invoice={selectedInvoice}
            isOpen={showInvoiceModal}
            onClose={() => setShowInvoiceModal(false)}
          />
          <PaymentModal
            invoice={selectedInvoice}
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
          />
        </>
      )}
    </>
  );
}
