'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Image,
  File,
  FileArchive,
  FileSpreadsheet,
  Download,
  Eye,
} from 'lucide-react';

interface AttachmentItemProps {
  attachment: {
    id: string;
    filename: string;
    size: number;
    contentType: string;
    contentId?: string;
    url?: string;
    providerFileId?: string;
  };
  emailId: string;
  accountId: string;
  onDownload: () => void;
}

export default function AttachmentItem({
  attachment,
  emailId,
  accountId,
  onDownload,
}: AttachmentItemProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    } else if (contentType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (
      contentType.includes('spreadsheet') ||
      contentType.includes('excel')
    ) {
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    } else if (
      contentType.includes('zip') ||
      contentType.includes('rar') ||
      contentType.includes('archive')
    ) {
      return <FileArchive className="h-5 w-5 text-yellow-500" />;
    } else if (
      contentType.includes('document') ||
      contentType.includes('word')
    ) {
      return <FileText className="h-5 w-5 text-blue-600" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const getFileExtension = (filename: string) => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
  };

  const isPreviewable = (contentType: string) => {
    return contentType.startsWith('image/') || contentType.includes('pdf');
  };

  return (
    <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
      {/* Icon */}
      <div className="flex-shrink-0">
        {getFileIcon(attachment.contentType)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {attachment.filename}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(attachment.size)}
          </span>
          {getFileExtension(attachment.filename) && (
            <Badge variant="secondary" className="text-xs">
              {getFileExtension(attachment.filename)}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isPreviewable(attachment.contentType) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement preview
            }}
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
