import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  Info
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedMedicine {
  row: number;
  data: {
    name: string;
    category: string;
    unitPrice: string;
    stockQuantity: number;
    lowStockThreshold: number;
    unit: string;
  };
}

interface ParseResult {
  success: boolean;
  totalRows: number;
  validMedicines: ParsedMedicine[];
  errors: Array<{
    row: number;
    data: any;
    errors: string[];
  }>;
  message: string;
}

export default function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [activeTab, setActiveTab] = useState("upload");
  const { toast } = useToast();

  const parseExcelMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/medicines/parse-excel', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to parse file');
      }
      
      return response.json();
    },
    onSuccess: (data: ParseResult) => {
      setParseResult(data);
      setActiveTab("preview");
      toast({
        title: "File Parsed Successfully",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Parse Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (medicines: ParsedMedicine[]) => {
      const response = await apiRequest("POST", "/api/medicines/bulk-import", {
        medicines: medicines.map(m => m.data)
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines/low-stock"] });
      toast({
        title: "Import Successful",
        description: data.message,
      });
      onClose();
      resetState();
    },
    onError: (error: Error) => {
      toast({
        title: "Import Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please select an Excel (.xlsx, .xls) or CSV file",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleParseFile = () => {
    if (selectedFile) {
      parseExcelMutation.mutate(selectedFile);
    }
  };

  const handleImport = () => {
    if (parseResult?.validMedicines) {
      bulkImportMutation.mutate(parseResult.validMedicines);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setParseResult(null);
    setActiveTab("upload");
  };

  const downloadTemplate = () => {
    // Create sample data for template
    const templateData = [
      {
        "Medicine Name": "Paracetamol 500mg",
        "Category": "Pain Relief",
        "Unit Price": "5.50",
        "Stock Quantity": "100",
        "Low Stock Threshold": "20",
        "Unit": "tablets"
      },
      {
        "Medicine Name": "Amoxicillin 250mg",
        "Category": "Antibiotic", 
        "Unit Price": "12.00",
        "Stock Quantity": "50",
        "Low Stock Threshold": "15",
        "Unit": "capsules"
      }
    ];

    // Convert to CSV
    const headers = Object.keys(templateData[0]);
    const csvContent = [
      headers.join(','),
      ...templateData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medicine_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-medical-teal" />
            Bulk Medicine Import
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="preview" disabled={!parseResult}>Preview Data</TabsTrigger>
            <TabsTrigger value="guide">Format Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload Excel File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <div className="space-y-2">
                    <Label htmlFor="file-upload" className="cursor-pointer text-medical-teal hover:text-soft-blue">
                      Click to upload or drag and drop
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <p className="text-sm text-gray-500">Excel (.xlsx, .xls) or CSV files only</p>
                  </div>
                </div>

                {selectedFile && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Selected file: <strong>{selectedFile.name}</strong> ({Math.round(selectedFile.size / 1024)} KB)
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>

                  <Button
                    onClick={handleParseFile}
                    disabled={!selectedFile || parseExcelMutation.isPending}
                    className="bg-medical-teal hover:bg-medical-teal/90"
                  >
                    {parseExcelMutation.isPending ? "Parsing..." : "Parse File"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {parseResult && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold">{parseResult.totalRows}</p>
                          <p className="text-sm text-gray-600">Total Rows</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-success-green" />
                        <div>
                          <p className="text-2xl font-bold text-success-green">{parseResult.validMedicines.length}</p>
                          <p className="text-sm text-gray-600">Valid Medicines</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-urgent-red" />
                        <div>
                          <p className="text-2xl font-bold text-urgent-red">{parseResult.errors.length}</p>
                          <p className="text-sm text-gray-600">Errors</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {parseResult.validMedicines.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-success-green">Valid Medicines</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-60">
                        <div className="space-y-2">
                          {parseResult.validMedicines.map((medicine, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{medicine.data.name}</p>
                                <p className="text-sm text-gray-600">
                                  {medicine.data.category} • {medicine.data.stockQuantity} {medicine.data.unit}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{formatCurrency(parseFloat(medicine.data.unitPrice))}</p>
                                <Badge variant="secondary">Row {medicine.row}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {parseResult.errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-urgent-red">Errors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {parseResult.errors.map((error, index) => (
                            <Alert key={index} variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                <strong>Row {error.row}:</strong> {error.errors.join(', ')}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setActiveTab("upload")}>
                    Upload Different File
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={parseResult.validMedicines.length === 0 || bulkImportMutation.isPending}
                    className="bg-success-green hover:bg-success-green/90"
                  >
                    {bulkImportMutation.isPending 
                      ? "Importing..." 
                      : `Import ${parseResult.validMedicines.length} Medicines`
                    }
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="guide" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Excel File Format Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Your Excel file should have the following columns in the first row (headers):
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Required Columns:</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge>Medicine Name</Badge>
                        <span className="text-sm">Name of the medicine</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>Category</Badge>
                        <span className="text-sm">Medicine category</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>Unit Price</Badge>
                        <span className="text-sm">Price per unit (BDT)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>Stock Quantity</Badge>
                        <span className="text-sm">Initial stock amount</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Optional Columns:</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Low Stock Threshold</Badge>
                        <span className="text-sm">Minimum stock alert (default: 10)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Unit</Badge>
                        <span className="text-sm">Unit type (default: pieces)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Alternative Column Names:</h4>
                  <p className="text-sm text-gray-600">
                    The system supports multiple variations of column names:
                  </p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Medicine Name:</strong> "Medicine Name", "name", "Name"</li>
                    <li>• <strong>Category:</strong> "Category", "category"</li>
                    <li>• <strong>Unit Price:</strong> "Unit Price", "unitPrice", "Price", "price"</li>
                    <li>• <strong>Stock Quantity:</strong> "Stock Quantity", "stockQuantity", "Stock", "stock"</li>
                    <li>• <strong>Low Stock Threshold:</strong> "Low Stock Threshold", "lowStockThreshold", "Threshold"</li>
                    <li>• <strong>Unit:</strong> "Unit", "unit"</li>
                  </ul>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important Notes:</strong>
                    <ul className="mt-2 space-y-1">
                      <li>• File size must be under 5MB</li>
                      <li>• Only .xlsx, .xls, and .csv files are supported</li>
                      <li>• Medicine names must be unique</li>
                      <li>• Prices should be in BDT without currency symbols</li>
                      <li>• Stock quantities must be positive numbers</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}