/**
 * ColumnMappingModal Component
 * 
 * Allows users to map CSV columns to contact fields
 * Features:
 * - Auto-detect common column names
 * - Dropdown selection for each field
 * - Skip unmapped columns
 * - Preview of mapping
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  csvHeaders: string[];
  onConfirm: (mapping: Record<string, string>) => void;
}

// Standard contact fields
const CONTACT_FIELDS = [
  { value: 'firstName', label: 'First Name', required: false },
  { value: 'lastName', label: 'Last Name', required: false },
  { value: 'email', label: 'Email', required: true },
  { value: 'phone', label: 'Phone', required: false },
  { value: 'company', label: 'Company', required: false },
  { value: 'jobTitle', label: 'Job Title', required: false },
  { value: 'location', label: 'Location', required: false },
  { value: 'website', label: 'Website', required: false },
  { value: 'linkedin', label: 'LinkedIn', required: false },
  { value: 'twitter', label: 'Twitter', required: false },
  { value: 'tags', label: 'Tags', required: false },
  { value: 'notes', label: 'Notes', required: false },
];

// Auto-detection patterns
const AUTO_DETECT_PATTERNS: Record<string, string[]> = {
  firstName: ['first name', 'firstname', 'first', 'given name', 'fname'],
  lastName: ['last name', 'lastname', 'last', 'surname', 'family name', 'lname'],
  email: ['email', 'e-mail', 'email address', 'mail'],
  phone: ['phone', 'telephone', 'mobile', 'cell', 'phone number', 'tel'],
  company: ['company', 'organization', 'organisation', 'business', 'employer'],
  jobTitle: ['job title', 'title', 'position', 'role', 'job'],
  location: ['location', 'address', 'city', 'region', 'place'],
  website: ['website', 'web', 'url', 'site', 'homepage'],
  linkedin: ['linkedin', 'linkedin url', 'li'],
  twitter: ['twitter', 'twitter handle', 'tw', 'x'],
  tags: ['tags', 'labels', 'categories', 'groups'],
  notes: ['notes', 'comments', 'description', 'memo'],
};

export function ColumnMappingModal({
  isOpen,
  onClose,
  csvHeaders,
  onConfirm,
}: ColumnMappingModalProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Auto-detect column mapping
  useEffect(() => {
    if (isOpen && csvHeaders.length > 0) {
      const autoMapping: Record<string, string> = {};

      csvHeaders.forEach(header => {
        const normalizedHeader = header.toLowerCase().trim();
        
        // Check each field's patterns
        for (const [fieldKey, patterns] of Object.entries(AUTO_DETECT_PATTERNS)) {
          if (patterns.some(pattern => normalizedHeader.includes(pattern))) {
            // Only map if not already mapped
            if (!Object.values(autoMapping).includes(header)) {
              autoMapping[fieldKey] = header;
              break;
            }
          }
        }
      });

      setMapping(autoMapping);
    }
  }, [isOpen, csvHeaders]);

  const handleMappingChange = (fieldKey: string, csvColumn: string) => {
    setMapping(prev => ({
      ...prev,
      [fieldKey]: csvColumn === 'none' ? '' : csvColumn,
    }));
  };

  const handleConfirm = () => {
    // Filter out empty mappings
    const cleanedMapping = Object.fromEntries(
      Object.entries(mapping).filter(([_, value]) => value)
    );
    
    onConfirm(cleanedMapping);
  };

  const isValid = mapping.email; // Email is required
  const mappedCount = Object.values(mapping).filter(v => v).length;
  const unmappedHeaders = csvHeaders.filter(
    header => !Object.values(mapping).includes(header)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Map CSV Columns</DialogTitle>
          <DialogDescription className="text-base">
            Match your CSV columns to contact fields. We've automatically detected some mappings for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Mapping Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">
                {mappedCount} of {CONTACT_FIELDS.length} fields mapped
              </p>
              {unmappedHeaders.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {unmappedHeaders.length} CSV column{unmappedHeaders.length !== 1 ? 's' : ''} will be skipped
                </p>
              )}
            </div>
            {isValid ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Ready to import</span>
              </div>
            ) : (
              <div className="text-sm text-destructive">
                Email field is required
              </div>
            )}
          </div>

          {/* Column Mappings */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm mb-3">Field Mappings</h3>
            
            {CONTACT_FIELDS.map(field => (
              <div key={field.value} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{field.label}</span>
                    {field.required && (
                      <span className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded">
                        Required
                      </span>
                    )}
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                <div className="flex-1">
                  <Select
                    value={mapping[field.value] || 'none'}
                    onValueChange={(value) => handleMappingChange(field.value, value)}
                  >
                    <SelectTrigger className={cn(
                      "w-full",
                      field.required && !mapping[field.value] && "border-destructive"
                    )}>
                      <SelectValue placeholder="Skip this field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">Skip this field</span>
                      </SelectItem>
                      {csvHeaders.map(header => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          {/* Unmapped CSV Columns */}
          {unmappedHeaders.length > 0 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h4 className="font-medium text-sm mb-2 text-yellow-900 dark:text-yellow-100">
                Unmapped CSV Columns
              </h4>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
                These columns from your CSV won't be imported:
              </p>
              <div className="flex flex-wrap gap-2">
                {unmappedHeaders.map(header => (
                  <span
                    key={header}
                    className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 text-xs rounded"
                  >
                    {header}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!isValid}>
              Confirm Mapping
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

