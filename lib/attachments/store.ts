/**
 * Attachments State Management Store
 * Zustand store for managing attachment UI state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Attachment, AppliedFilters, DocumentType } from './types';

export interface AttachmentsState {
  // UI State
  view: 'grid' | 'list';
  sortBy: 'date' | 'name' | 'size' | 'sender' | 'type';
  sortOrder: 'asc' | 'desc';
  
  // Selection
  selectedIds: string[];
  
  // Filters
  filters: AppliedFilters;
  
  // Preview
  previewAttachment: Attachment | null;
  
  // Actions
  setView: (view: 'grid' | 'list') => void;
  setSorting: (sortBy: AttachmentsState['sortBy'], sortOrder: AttachmentsState['sortOrder']) => void;
  
  // Selection actions
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  
  // Filter actions
  setFilters: (filters: Partial<AppliedFilters>) => void;
  clearFilters: () => void;
  setSearch: (search: string) => void;
  setFileTypes: (types: string[]) => void;
  setDocumentTypes: (types: DocumentType[]) => void;
  setDateRange: (from?: Date, to?: Date) => void;
  setSenders: (senders: string[]) => void;
  
  // Preview actions
  openPreview: (attachment: Attachment) => void;
  closePreview: () => void;
}

export const useAttachmentsStore = create<AttachmentsState>()(
  persist(
    (set) => ({
      // Initial state
      view: 'grid',
      sortBy: 'date',
      sortOrder: 'desc',
      selectedIds: [],
      filters: {
        fileTypes: [],
        documentTypes: [],
        senders: [],
      },
      previewAttachment: null,

      // View actions
      setView: (view) => set({ view }),
      
      setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),

      // Selection actions
      toggleSelect: (id) =>
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((sid) => sid !== id)
            : [...state.selectedIds, id],
        })),

      selectAll: (ids) => set({ selectedIds: ids }),

      clearSelection: () => set({ selectedIds: [] }),

      // Filter actions
      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      clearFilters: () =>
        set({
          filters: {
            fileTypes: [],
            documentTypes: [],
            senders: [],
          },
        }),

      setSearch: (search) =>
        set((state) => ({
          filters: { ...state.filters, search },
        })),

      setFileTypes: (fileTypes) =>
        set((state) => ({
          filters: { ...state.filters, fileTypes },
        })),

      setDocumentTypes: (documentTypes) =>
        set((state) => ({
          filters: { ...state.filters, documentTypes },
        })),

      setDateRange: (from, to) =>
        set((state) => ({
          filters: {
            ...state.filters,
            dateRange: from && to ? { from, to } : undefined,
          },
        })),

      setSenders: (senders) =>
        set((state) => ({
          filters: { ...state.filters, senders },
        })),

      // Preview actions
      openPreview: (attachment) => set({ previewAttachment: attachment }),

      closePreview: () => set({ previewAttachment: null }),
    }),
    {
      name: 'easemail-attachments-store',
      partialize: (state) => ({
        view: state.view,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        // Don't persist selections, filters, or preview
      }),
    }
  )
);

