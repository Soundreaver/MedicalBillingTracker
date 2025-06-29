import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Eye, CreditCard, Download, Edit, Clock } from "lucide-react";
import { formatCurrency, formatDate, getInitials, getDaysOverdue, getStatusColor } from "@/lib/utils";
import { generateInvoicePDF } from "@/lib/pdf-generator";
import { InvoiceWithDetails } from "@shared/schema";
import InvoiceModal from "@/components/modals/invoice-modal";
import PaymentModal from "@/components/modals/payment-modal";
import CreateInvoiceModal from "@/components/modals/create-invoice-modal";
import EditInvoiceModal from "@/components/modals/edit-invoice-modal";

export default function Billing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showEditInvoice, setShowEditInvoice] = useState(false);
  const { toast } = useToast();

  const { data: invoices = [], isLoading } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"],
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

  const handleEditInvoice = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setShowEditInvoice(true);
  };

  const updateRoomChargesMutation = useMutation({
    mutationFn: async () => {
      // For now, just process all room charges - this will update all occupied rooms
      const response = await apiRequest("POST", `/api/rooms/process-daily-charges`);
      return await response.json();
    },
    onSuccess: (data: { processed: number; totalCharges: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Room Charges Updated",
        description: `Updated charges for ${data.processed} room(s) with total of ${formatCurrency(data.totalCharges.toString())}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update room charges",
        variant: "destructive",
      });
    },
  });

  const handleUpdateRoomCharges = (invoice: InvoiceWithDetails) => {
    updateRoomChargesMutation.mutate();
  };

  const getInvoiceStatus = (invoice: InvoiceWithDetails) => {
    if (invoice.outstandingAmount <= 0) return "paid";
    const daysOverdue = getDaysOverdue(invoice.dueDate);
    return daysOverdue > 0 ? "overdue" : "pending";
  };

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
  const totalOutstanding = filteredInvoices.reduce((sum, inv) => sum + inv.outstandingAmount, 0);
  const totalPaid = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.paidAmount), 0);

  if (isLoading) {
    return <div className="flex justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-professional-dark">Billing & Invoices</h1>
          <p className="text-gray-600">Create and manage invoices for patients</p>
        </div>
        <Button 
          className="bg-medical-teal hover:bg-medical-teal/90"
          onClick={() => setShowCreateInvoice(true)}
        >
          <Plus className="mr-2" size={16} />
          Create Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Invoiced</p>
              <p className="text-2xl font-bold text-professional-dark mt-2">{formatCurrency(totalAmount)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
              <p className="text-2xl font-bold text-urgent-red mt-2">{formatCurrency(totalOutstanding)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Collected</p>
              <p className="text-2xl font-bold text-success-green mt-2">{formatCurrency(totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle>All Invoices</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Search invoices..."
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
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-professional-dark">
                          {formatCurrency(invoice.totalAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-success-green font-medium">
                          {formatCurrency(invoice.paidAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-urgent-red font-medium">
                          {formatCurrency(invoice.outstandingAmount)}
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
                          {invoice.outstandingAmount > 0 && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditInvoice(invoice)}
                                className="text-orange-600 hover:text-orange-700"
                                title="Edit Invoice"
                              >
                                <Edit size={16} />
                              </Button>
                              {invoice.description?.includes('Room assignment') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleUpdateRoomCharges(invoice)}
                                  className="text-purple-600 hover:text-purple-700"
                                  title="Update Room Charges"
                                >
                                  <Clock size={16} />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRecordPayment(invoice)}
                                className="text-success-green hover:text-green-700"
                                title="Record Payment"
                              >
                                <CreditCard size={16} />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadPDF(invoice)}
                            className="text-soft-blue hover:text-blue-700"
                            title="Download PDF"
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
              <p className="text-gray-500">No invoices found</p>
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

      <CreateInvoiceModal
        isOpen={showCreateInvoice}
        onClose={() => setShowCreateInvoice(false)}
      />

      {selectedInvoice && (
        <EditInvoiceModal
          invoice={selectedInvoice}
          isOpen={showEditInvoice}
          onClose={() => setShowEditInvoice(false)}
        />
      )}
    </div>
  );
}
