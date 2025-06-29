import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, FileText, Trash2, Edit, Download, Upload } from "lucide-react";
import { insertPatientSchema, insertPatientDocumentSchema, type Patient, type PatientDocument } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

interface EditPatientModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
}

type PatientFormData = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

type DocumentFormData = {
  documentType: string;
  documentName: string;
  documentUrl: string;
  notes: string;
};

export default function EditPatientModal({ patient, isOpen, onClose }: EditPatientModalProps) {
  const [activeTab, setActiveTab] = useState("details");
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [editingDocument, setEditingDocument] = useState<PatientDocument | null>(null);
  const { toast } = useToast();

  const patientForm = useForm<PatientFormData>({
    resolver: zodResolver(insertPatientSchema.pick({
      name: true,
      phone: true,
      email: true,
      address: true,
    })),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  const documentForm = useForm<DocumentFormData>({
    resolver: zodResolver(insertPatientDocumentSchema.pick({
      documentType: true,
      documentName: true,
      documentUrl: true,
      notes: true,
    })),
    defaultValues: {
      documentType: "",
      documentName: "",
      documentUrl: "",
      notes: "",
    },
  });

  // Load patient data when modal opens
  useEffect(() => {
    if (patient && isOpen) {
      patientForm.reset({
        name: patient.name,
        phone: patient.phone || "",
        email: patient.email || "",
        address: patient.address || "",
      });
      loadDocuments();
    }
  }, [patient, isOpen, patientForm]);

  const loadDocuments = async () => {
    if (!patient) return;
    try {
      const response = await apiRequest("GET", `/api/patients/${patient.id}/documents`);
      const docs = await response.json();
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to load documents:", error);
    }
  };

  const updatePatientMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      if (!patient) throw new Error("No patient selected");
      const response = await apiRequest("PUT", `/api/patients/${patient.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Success",
        description: "Patient updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update patient",
        variant: "destructive",
      });
    },
  });

  const addDocumentMutation = useMutation({
    mutationFn: async (data: DocumentFormData) => {
      if (!patient) throw new Error("No patient selected");
      const response = await apiRequest("POST", `/api/patients/${patient.id}/documents`, data);
      return response.json();
    },
    onSuccess: () => {
      loadDocuments();
      documentForm.reset();
      setIsAddingDocument(false);
      toast({
        title: "Success",
        description: "Document added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add document",
        variant: "destructive",
      });
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DocumentFormData> }) => {
      const response = await apiRequest("PUT", `/api/documents/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      loadDocuments();
      documentForm.reset();
      setEditingDocument(null);
      toast({
        title: "Success",
        description: "Document updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update document",
        variant: "destructive",
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/documents/${id}`);
      return response.json();
    },
    onSuccess: () => {
      loadDocuments();
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const onSubmitPatient = (data: PatientFormData) => {
    updatePatientMutation.mutate(data);
  };

  const onSubmitDocument = (data: DocumentFormData) => {
    if (editingDocument) {
      updateDocumentMutation.mutate({ id: editingDocument.id, data });
    } else {
      addDocumentMutation.mutate(data);
    }
  };

  const handleEditDocument = (document: PatientDocument) => {
    setEditingDocument(document);
    documentForm.reset({
      documentType: document.documentType,
      documentName: document.documentName,
      documentUrl: document.documentUrl || "",
      notes: document.notes || "",
    });
    setIsAddingDocument(true);
  };

  const handleCancelDocument = () => {
    setIsAddingDocument(false);
    setEditingDocument(null);
    documentForm.reset();
  };

  const documentTypes = [
    { value: "report", label: "Medical Report" },
    { value: "xray", label: "X-Ray" },
    { value: "scan", label: "CT/MRI Scan" },
    { value: "prescription", label: "Prescription" },
    { value: "lab", label: "Lab Results" },
    { value: "other", label: "Other" },
  ];

  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="mr-2" size={20} />
            Edit Patient: {patient.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Patient Details</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <TabsContent value="details" className="mt-4">
              <Form {...patientForm}>
                <form onSubmit={patientForm.handleSubmit(onSubmitPatient)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={patientForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={patientForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={patientForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={patientForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-medical-teal hover:bg-medical-teal/90"
                      disabled={updatePatientMutation.isPending}
                    >
                      {updatePatientMutation.isPending ? "Updating..." : "Update Patient"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Patient Documents</h3>
                  <Button
                    onClick={() => setIsAddingDocument(true)}
                    className="bg-medical-teal hover:bg-medical-teal/90"
                    size="sm"
                  >
                    <Upload className="mr-2" size={16} />
                    Add Document
                  </Button>
                </div>

                {isAddingDocument && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {editingDocument ? "Edit Document" : "Add New Document"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Form {...documentForm}>
                        <form onSubmit={documentForm.handleSubmit(onSubmitDocument)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={documentForm.control}
                              name="documentType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Document Type</FormLabel>
                                  <FormControl>
                                    <select {...field} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                      <option value="">Select type...</option>
                                      {documentTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                          {type.label}
                                        </option>
                                      ))}
                                    </select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={documentForm.control}
                              name="documentName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Document Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g., Chest X-Ray March 2025" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={documentForm.control}
                            name="documentUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Upload PDF or Enter URL</FormLabel>
                                <FormControl>
                                  <div className="space-y-2">
                                    <Input 
                                      type="file" 
                                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          // In a real app, you'd upload to cloud storage
                                          field.onChange(`file://${file.name}`);
                                        }
                                      }}
                                    />
                                    <div className="text-center text-sm text-gray-500">OR</div>
                                    <Input 
                                      {...field} 
                                      placeholder="Enter document URL..." 
                                      type="url"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={documentForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                  <Textarea {...field} rows={3} placeholder="Additional notes about this document..." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={handleCancelDocument}>
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              className="bg-medical-teal hover:bg-medical-teal/90"
                              disabled={addDocumentMutation.isPending || updateDocumentMutation.isPending}
                            >
                              {editingDocument ? "Update Document" : "Add Document"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4">
                  {documents.map((document) => (
                    <Card key={document.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <FileText size={16} className="text-medical-teal" />
                              <h4 className="font-medium">{document.documentName}</h4>
                              <Badge variant="secondary">
                                {documentTypes.find(t => t.value === document.documentType)?.label || document.documentType}
                              </Badge>
                            </div>
                            {document.notes && (
                              <p className="text-sm text-gray-600 mb-2">{document.notes}</p>
                            )}
                            <p className="text-xs text-gray-500">
                              Added on {formatDate(document.createdAt || "")}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            {document.documentUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(document.documentUrl!, '_blank')}
                              >
                                <Download size={16} />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditDocument(document)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteDocumentMutation.mutate(document.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {documents.length === 0 && !isAddingDocument && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText size={48} className="mx-auto mb-4 opacity-30" />
                      <p>No documents found for this patient.</p>
                      <p className="text-sm">Click "Add Document" to upload patient documents.</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}