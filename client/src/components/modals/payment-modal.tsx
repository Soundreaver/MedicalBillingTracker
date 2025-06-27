import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CreditCard, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, getInitials } from "@/lib/utils";
import { InvoiceWithDetails, insertPaymentSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PaymentModalProps {
  invoice: InvoiceWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

const paymentFormSchema = insertPaymentSchema.extend({
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Amount must be a positive number"
  ),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

const paymentMethods = [
  "Cash",
  "Card",
  "Bank Transfer",
  "Mobile Banking",
  "Insurance",
  "Check"
];

export default function PaymentModal({ invoice, isOpen, onClose }: PaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      invoiceId: invoice.id,
      amount: invoice.outstandingAmount.toString(),
      paymentMethod: "Cash",
      reference: "",
      notes: "",
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const response = await apiRequest("POST", "/api/payments", {
        ...data,
        amount: data.amount, // Keep as string for decimal validation
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/outstanding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    try {
      await createPaymentMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const setFullAmount = () => {
    form.setValue("amount", invoice.outstandingAmount.toString());
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-professional-dark">
                Record Payment
              </DialogTitle>
              <p className="text-gray-600 mt-1">Invoice: {invoice.invoiceNumber}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X size={16} />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-medical-teal/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-medical-teal">
                  {getInitials(invoice.patient.name)}
                </span>
              </div>
              <div>
                <h4 className="font-medium text-professional-dark">{invoice.patient.name}</h4>
                <p className="text-sm text-gray-600">{invoice.patient.patientId}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="font-semibold text-professional-dark">{formatCurrency(invoice.totalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Paid Amount</p>
                <p className="font-semibold text-success-green">{formatCurrency(invoice.paidAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="font-semibold text-urgent-red">{formatCurrency(invoice.outstandingAmount)}</p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount *</FormLabel>
                    <div className="flex space-x-2">
                      <FormControl>
                        <Input
                          placeholder="Enter amount"
                          {...field}
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={invoice.outstandingAmount}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={setFullAmount}
                        className="whitespace-nowrap"
                      >
                        Full Amount
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Transaction reference, check number, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about the payment..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || createPaymentMutation.isPending}
                  className="bg-success-green hover:bg-success-green/90"
                >
                  <CreditCard className="mr-2" size={16} />
                  {isSubmitting ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
