import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, FileText, AlertCircle } from 'lucide-react';
import { userManagementService } from '../../../domain/admin/userManagement.service';
import { Button } from '../../../components/ui/button';
import { config } from '@/lib/config';
import { useNotification } from '@/hooks/useNotification';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';

export default function AdminUserImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError, showWarning } = useNotification();

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (data: any) => userManagementService.importUsersFromCSV(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setImportResult(result);
      
      showSuccess(
        'Import Complete',
        `${result.imported} user(s) imported successfully`
      );


      if (result.failed.length > 0) {
        showWarning(
          'Partial Import',
          `${result.failed.length} user(s) failed to import`
        );
      }
    },
    onError: () => {
      showError(
        'Error',
        'Failed to import users'
      );
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      showError(
        'Invalid CSV',
        'CSV file is empty or invalid'
      );
      return;
    }

    // Helper function to parse CSV line with proper quote handling
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    // Parse header to find column indices
    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
    const emailIdx = headers.indexOf('email');
    const nameIdx = headers.indexOf('displayname');
    const roleIdx = headers.indexOf('role');
    const passwordIdx = headers.indexOf('password');

    if (emailIdx === -1 || nameIdx === -1 || roleIdx === -1) {
      showError(
        'Invalid CSV Format',
        'CSV must have email, displayName, and role columns'
      );
      return;
    }

    const data = lines.slice(1).map((line) => {
      const values = parseCSVLine(line);
      return {
        email: values[emailIdx] || '',
        displayName: values[nameIdx] || '',
        role: values[roleIdx] || '',
        password: passwordIdx !== -1 ? values[passwordIdx] || '' : '',
      };
    });

    setParsedData(data);
  };

  const handleImport = () => {
    if (parsedData.length === 0) {
      showError(
        'No Data',
        'No data to import'
      );
      return;
    }

    importMutation.mutate({ users: parsedData });
  };

  const handleDownloadTemplate = () => {
    userManagementService.downloadCSVTemplate();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6 pb-24">
          {/* Header */}
          <div className="text-left">
            <h1 className="text-3xl font-bold">Bulk User Import</h1>
            <p className="text-muted-foreground">
              Import multiple users from a CSV file
            </p>
          </div>

      {/* Instructions */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertTitle>How to import users</AlertTitle>
        <AlertDescription>
          Download the CSV template, fill in user details (email, displayName, role, password), and
          upload the file. Supports CSV format only - if using Excel, save as CSV (.csv) before uploading.
          Password is REQUIRED (minimum 8 characters). All imported users will be created with active status.
        </AlertDescription>
      </Alert>

      {/* Download Template */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Download Template</CardTitle>
          <CardDescription>
            Get the CSV template with required fields: email, displayName, role, password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV Template
          </Button>
        </CardContent>
      </Card>

      {/* Upload File */}
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Upload CSV File</CardTitle>
          <CardDescription>Select your completed CSV file. If created in Excel, save as CSV format first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <Button asChild>
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </label>
            </Button>
            {csvFile && (
              <span className="text-sm text-muted-foreground">{csvFile.name}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {parsedData.length > 0 && !importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Preview & Import</CardTitle>
            <CardDescription>
              Review {parsedData.length} user(s) before importing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Password</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((user, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 2}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.displayName}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        {user.password ? '••••••••' : <span className="text-destructive text-xs font-medium">Missing (required!)</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>
              {importResult.imported} user(s) imported,{' '}
              {importResult.failed.length} failed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {importResult.failed.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Some imports failed</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1">
                    {importResult.failed.map((error: any, index: number) => (
                      <div key={index} className="text-sm">
                        Row {error.row} ({error.email}): {error.reason}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setCsvFile(null);
                setParsedData([]);
                setImportResult(null);
              }}
            >
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}
        </div>
      </div>

      {/* STICKY ACTION BAR */}
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur shadow-lg">
        <div className="container mx-auto px-6 py-3 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(config.routes.adminUsers)}
            disabled={importMutation.isPending}
          >
            Cancel
          </Button>
          {parsedData.length > 0 && !importResult && (
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import {parsedData.length} User(s)
            </Button>
          )}
          {importResult && (
            <Button onClick={() => navigate(config.routes.adminUsers)}>
              View All Users
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
