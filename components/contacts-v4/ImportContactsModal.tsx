'use client';

/**
 * Import Contacts Modal - MVP Version
 * Simple file upload with automatic field mapping
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileText, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { parseContactFile, getSuggestedMapping, type ParseResult, type ParsedContact } from '@/lib/contacts/import-parser';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ImportContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  onImportComplete: () => void;
}

type Step = 'upload' | 'mapping' | 'importing' | 'complete';

const CONTACT_FIELDS = [
  { value: 'givenName', label: 'First Name' },
  { value: 'surname', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phoneNumber', label: 'Phone Number' },
  { value: 'companyName', label: 'Company' },
  { value: 'jobTitle', label: 'Job Title' },
  { value: 'street', label: 'Street Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State/Province' },
  { value: 'postalCode', label: 'Postal Code' },
  { value: 'country', label: 'Country' },
  { value: 'notes', label: 'Notes' },
  { value: 'skip', label: '(Skip this field)' },
];

export default function ImportContactsModal({
  isOpen,
  onClose,
  accountId,
  onImportComplete,
}: ImportContactsModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importedCount, setImportedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const handleFileSelect = async (selectedFile: File) => {
    try {
      setFile(selectedFile);

      // Parse the file
      const result = await parseContactFile(selectedFile);
      setParseResult(result);

      // Auto-generate field mapping
      const suggestedMapping = getSuggestedMapping(result.headers);
      setFieldMapping(suggestedMapping);

      setStep('mapping');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to parse file',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (!parseResult || !accountId) return;

    setStep('importing');

    try {
      // Map contacts according to field mapping
      const mappedContacts = parseResult.contacts.map((contact) => {
        const mapped: any = {};

        Object.entries(fieldMapping).forEach(([sourceField, targetField]) => {
          if (targetField !== 'skip' && contact[sourceField]) {
            const value = contact[sourceField];

            // Handle email and phone as arrays
            if (targetField === 'email') {
              mapped.emails = Array.isArray(value)
                ? value.map(v => ({ email: v, type: 'work' }))
                : [{ email: value, type: 'work' }];
            } else if (targetField === 'phoneNumber') {
              mapped.phoneNumbers = Array.isArray(value)
                ? value.map(v => ({ number: v, type: 'mobile' }))
                : [{ number: value, type: 'mobile' }];
            } else {
              mapped[targetField] = value;
            }
          }
        });

        return mapped;
      });

      // Send to API
      const response = await fetch('/api/contacts-v4/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          contacts: mappedContacts,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setImportedCount(data.imported || 0);
        setErrorCount(data.errors || 0);
        setStep('complete');
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import contacts',
        variant: 'destructive',
      });
      setStep('mapping');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setParseResult(null);
    setFieldMapping({});
    setImportedCount(0);
    setErrorCount(0);
    onClose();
  };

  const handleComplete = () => {
    onImportComplete();
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            Import contacts from CSV, vCard (.vcf), or Excel files
          </DialogDescription>
        </DialogHeader>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                Supports CSV, vCard (.vcf), and Excel (.xlsx, .xls) files
              </p>
              <input
                id="file-input"
                type="file"
                accept=".csv,.vcf,.vcard,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>

            {file && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {file.name.endsWith('.csv') && <FileText className="h-5 w-5 text-blue-600" />}
                {(file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) && (
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                )}
                {file.name.endsWith('.vcf') && <FileText className="h-5 w-5 text-purple-600" />}
                <span className="text-sm font-medium">{file.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Mapping Step */}
        {step === 'mapping' && parseResult && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Found {parseResult.totalCount} contacts. Map the fields below to import them.
              </p>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {parseResult.headers.map((header) => (
                <div key={header} className="grid grid-cols-2 gap-4 items-center">
                  <div className="text-sm font-medium text-gray-700">{header}</div>
                  <Select
                    value={fieldMapping[header] || 'skip'}
                    onValueChange={(value) => {
                      setFieldMapping((prev) => ({
                        ...prev,
                        [header]: value,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-sm text-gray-600">Importing contacts...</p>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Import Complete!</h3>
              <p className="text-sm text-gray-600 text-center">
                Successfully imported {importedCount} contacts
                {errorCount > 0 && ` (${errorCount} errors)`}
              </p>
            </div>

            {errorCount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-900">Some contacts could not be imported</p>
                    <p className="text-xs text-orange-700 mt-1">
                      This may be due to missing required fields or duplicate emails.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleImport}>
                Import {parseResult?.totalCount} Contacts
              </Button>
            </>
          )}

          {step === 'complete' && (
            <Button onClick={handleComplete}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
