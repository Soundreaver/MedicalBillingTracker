import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Eye, FileText } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { Patient, InvoiceWithDetails } from "@shared/schema";
import AddPatientModal from "@/components/modals/add-patient-modal";

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: patientInvoices = [] } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/patients", selectedPatient?.id, "invoices"],
    enabled: !!selectedPatient,
  });

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.phone && patient.phone.includes(searchTerm))
  );

  if (isLoading) {
    return <div className="flex justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-professional-dark">Patients</h1>
          <p className="text-gray-600">Manage patient information and billing history</p>
        </div>
        <Button 
          className="bg-medical-teal hover:bg-medical-teal/90"
          onClick={() => setIsAddPatientModalOpen(true)}
        >
          <Plus className="mr-2" size={16} />
          Add New Patient
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Patients List */}
        <div className="lg:col-span-2">
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle>All Patients</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Search patients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedPatient?.id === patient.id ? 'bg-medical-teal/5 border-r-4 border-medical-teal' : ''
                    }`}
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-medical-teal/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-medical-teal">
                            {getInitials(patient.name)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-professional-dark">{patient.name}</h3>
                          <p className="text-sm text-gray-500">{patient.patientId}</p>
                          {patient.phone && (
                            <p className="text-sm text-gray-500">{patient.phone}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Registered</p>
                        <p className="text-sm font-medium">{formatDate(patient.createdAt!)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredPatients.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No patients found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Patient Details */}
        <div className="lg:col-span-1">
          {selectedPatient ? (
            <div className="space-y-6">
              {/* Patient Info */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Patient Details
                    <Button variant="outline" size="sm">
                      <Eye className="mr-2" size={14} />
                      Edit
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-medical-teal/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-lg font-medium text-medical-teal">
                        {getInitials(selectedPatient.name)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-professional-dark">{selectedPatient.name}</h3>
                    <p className="text-sm text-gray-500">{selectedPatient.patientId}</p>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedPatient.phone && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Phone</label>
                        <p className="text-sm text-professional-dark">{selectedPatient.phone}</p>
                      </div>
                    )}
                    
                    {selectedPatient.email && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Email</label>
                        <p className="text-sm text-professional-dark">{selectedPatient.email}</p>
                      </div>
                    )}
                    
                    {selectedPatient.address && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Address</label>
                        <p className="text-sm text-professional-dark">{selectedPatient.address}</p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Registered</label>
                      <p className="text-sm text-professional-dark">{formatDate(selectedPatient.createdAt!)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Billing History */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Billing History
                    <Button variant="outline" size="sm">
                      <FileText className="mr-2" size={14} />
                      New Invoice
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patientInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-medium text-professional-dark">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-gray-500">{formatDate(invoice.createdAt!)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-professional-dark">৳ {invoice.totalAmount}</p>
                          <Badge className={invoice.outstandingAmount > 0 ? 'bg-urgent-red/10 text-urgent-red' : 'bg-success-green/10 text-success-green'}>
                            {invoice.outstandingAmount > 0 ? 'Pending' : 'Paid'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    {patientInvoices.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No billing history</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border border-gray-200">
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">Select a patient to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AddPatientModal
        isOpen={isAddPatientModalOpen}
        onClose={() => setIsAddPatientModalOpen(false)}
      />
    </div>
  );
}
