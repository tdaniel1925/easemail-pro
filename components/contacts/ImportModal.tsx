'use client';

import { useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ColumnMappingModal } from './ColumnMappingModal';
import { useToast } from '@/components/ui/use-toast';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
      
      // Parse CSV to get headers
      try {
        const text = await selectedFile.text();
        const parsed = parseCSV(text);
        if (parsed.length > 0) {
          const headers = Object.keys(parsed[0]);
          setCsvHeaders(headers);
          setCsvData(parsed);
          setShowMapping(true); // Show mapping modal
        }
      } catch (error) {
        console.error('Failed to parse CSV:', error);
        toast({
          title: 'Error',
          description: 'Failed to read CSV file',
          variant: 'destructive'
        });
      }
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please select a valid CSV file',
        variant: 'destructive'
      });
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }

    return data;
  };

  const handleMappingConfirm = (mapping: Record<string, string>) => {
    setColumnMapping(mapping);
    setShowMapping(false);
    // Auto-proceed to import after mapping
    performImport(mapping);
  };

  const performImport = async (mapping: Record<string, string>) => {
    setImporting(true);
    try {
      // Transform CSV data using the mapping
      const mappedContacts = csvData.map(row => {
        const contact: any = {};
        
        for (const [fieldKey, csvColumn] of Object.entries(mapping)) {
          if (csvColumn && row[csvColumn]) {
            contact[fieldKey] = row[csvColumn];
          }
        }
        
        return contact;
      });

      if (mappedContacts.length === 0) {
        toast({
          title: 'No Contacts',
          description: 'No valid contacts found after mapping',
          variant: 'destructive'
        });
        setImporting(false);
        return;
      }

      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: mappedContacts }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        if (data.imported > 0) {
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      } else {
        toast({
          title: 'Import Failed',
          description: data.error || 'Failed to import contacts',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: 'Import Error',
        description: 'Failed to import contacts',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const contacts = parseCSV(text);

      if (contacts.length === 0) {
        toast({
          title: 'No Contacts',
          description: 'No valid contacts found in CSV file',
          variant: 'destructive'
        });
        setImporting(false);
        return;
      }

      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        if (data.imported > 0) {
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      } else {
        toast({
          title: 'Import Failed',
          description: data.error || 'Failed to import contacts',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: 'Import Error',
        description: 'Failed to import contacts',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      'First Name,Last Name,Email,Phone,Company,Job Title,Location,Website,LinkedIn,Twitter,Tags,Notes',
      'John,Doe,john@example.com,+1-555-0100,Example Corp,CEO,San Francisco CA,https://example.com,https://linkedin.com/in/johndoe,@johndoe,"VIP,Client",Great contact',
      'Jane,Smith,jane@company.com,+1-555-0101,Tech Inc,CTO,New York NY,,,,"Work,Partner",Important client',
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Import Contacts from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Template Download */}
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm mb-2">
              Don't have a CSV file? Download our template to get started.
            </p>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          {!result && (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  {file ? file.name : 'Choose a CSV file'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {file ? 'Click to select a different file' : 'or drag and drop'}
                </p>
                <Button variant="outline" type="button">
                  Select File
                </Button>
              </label>
            </div>
          )}

          {/* Import Result */}
          {result && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    Import Complete
                  </h3>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Successfully imported {result.imported} contact{result.imported !== 1 ? 's' : ''}
                </p>
              </div>

              {result.errors > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                      {result.errors} Error{result.errors !== 1 ? 's' : ''}
                    </h3>
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 max-h-40 overflow-y-auto">
                    {result.errorDetails?.slice(0, 5).map((error: any, index: number) => (
                      <div key={index}>
                        • {error.row.Email || 'Unknown'}: {error.error}
                      </div>
                    ))}
                    {result.errorDetails?.length > 5 && (
                      <div className="mt-2 font-medium">
                        ... and {result.errorDetails.length - 5} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CSV Format Help */}
          {!result && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-sm">How It Works:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Upload any CSV file with contact information</li>
                <li>• Map your CSV columns to our contact fields</li>
                <li>• We'll auto-detect common field names for you</li>
                <li>• <strong>Email</strong> field is required, all others are optional</li>
                <li>• Skip columns you don't need</li>
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && file && !importing && (
              <Button onClick={() => setShowMapping(true)}>
                Review Mapping
              </Button>
            )}
          </div>
        </div>

        {/* Column Mapping Modal */}
        <ColumnMappingModal
          isOpen={showMapping}
          onClose={() => setShowMapping(false)}
          csvHeaders={csvHeaders}
          onConfirm={handleMappingConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}

