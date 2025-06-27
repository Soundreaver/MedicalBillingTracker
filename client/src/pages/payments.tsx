import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Eye } from "lucide-react";
import { formatCurrency, formatDateTime, getInitials } from "@/lib/utils";
import { Payment, InvoiceWithDetails } from "@shared/schema";

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: invoices = [] } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"],
  });

  const paymentsWithInvoiceDetails = payments.map(payment => {
    const invoice = invoices.find(inv => inv.id === payment.invoiceId);
    return { ...payment, invoice };
  });

  const filteredPayments = paymentsWithInvoiceDetails.filter(payment => {
    const matchesSearch = payment.invoice?.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.invoice?.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (payment.reference && payment.reference.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesMethod = methodFilter === "all" || payment.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const totalPayments = filteredPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  const paymentMethods = payments.reduce((acc: string[], payment) => {
    if (!acc.includes(payment.paymentMethod)) {
      acc.push(payment.paymentMethod);
    }
    return acc;
  }, []);

  if (paymentsLoading) {
    return <div className="flex justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-professional-dark">Payments</h1>
          <p className="text-gray-600">Track and record payment transactions</p>
        </div>
        <Button className="bg-medical-teal hover:bg-medical-teal/90">
          <Plus className="mr-2" size={16} />
          Record Payment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Payments</p>
              <p className="text-2xl font-bold text-professional-dark mt-2">{payments.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-success-green mt-2">{formatCurrency(totalPayments)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Today's Payments</p>
              <p className="text-2xl font-bold text-professional-dark mt-2">
                {payments.filter(p => {
                  const today = new Date();
                  const paymentDate = new Date(p.paymentDate!);
                  return paymentDate.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-professional-dark mt-2">
                {formatCurrency(
                  payments
                    .filter(p => {
                      const paymentDate = new Date(p.paymentDate!);
                      const today = new Date();
                      return paymentDate.getMonth() === today.getMonth() && 
                             paymentDate.getFullYear() === today.getFullYear();
                    })
                    .reduce((sum, p) => sum + parseFloat(p.amount), 0)
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle>Payment History</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {paymentMethods.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
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
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-professional-dark">
                        {formatDateTime(payment.paymentDate!)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-professional-dark">
                        {payment.invoice?.invoiceNumber || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.invoice && (
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-medical-teal/10 rounded-full flex items-center justify-center mr-3">
                            <span className="text-xs font-medium text-medical-teal">
                              {getInitials(payment.invoice.patient.name)}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-professional-dark">
                              {payment.invoice.patient.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {payment.invoice.patient.patientId}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-success-green">
                        {formatCurrency(payment.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline" className="bg-gray-50">
                        {payment.paymentMethod}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {payment.reference || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-medical-teal hover:text-soft-blue"
                      >
                        <Eye size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredPayments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No payments found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
