/**
 * Attachments React Hooks
 * React Query hooks for attachment operations
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import type {
  Attachment,
  GetAttachmentsParams,
  GetAttachmentsResponse,
  AttachmentStats,
  SmartFilter,
} from './types';
import { attachmentsApi } from './api';

// Query keys
export const attachmentKeys = {
  all: ['attachments'] as const,
  lists: () => [...attachmentKeys.all, 'list'] as const,
  list: (params?: GetAttachmentsParams) => [...attachmentKeys.lists(), params] as const,
  details: () => [...attachmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...attachmentKeys.details(), id] as const,
  stats: () => [...attachmentKeys.all, 'stats'] as const,
  smartFilters: () => [...attachmentKeys.all, 'smart-filters'] as const,
};

/**
 * Fetch attachments list
 */
export function useAttachments(
  params?: GetAttachmentsParams,
  options?: Omit<UseQueryOptions<GetAttachmentsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: attachmentKeys.list(params),
    queryFn: () => attachmentsApi.list(params),
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
}

/**
 * Fetch single attachment
 */
export function useAttachment(
  id: string,
  options?: Omit<UseQueryOptions<Attachment>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: attachmentKeys.detail(id),
    queryFn: () => attachmentsApi.get(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetch attachment preview URL
 */
export function useAttachmentPreviewUrl(id: string) {
  return useQuery({
    queryKey: [...attachmentKeys.detail(id), 'preview'],
    queryFn: () => attachmentsApi.getPreviewUrl(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Fetch attachment statistics
 */
export function useAttachmentStats(
  options?: Omit<UseQueryOptions<AttachmentStats>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: attachmentKeys.stats(),
    queryFn: () => attachmentsApi.getStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Fetch smart filters
 */
export function useSmartFilters(
  options?: Omit<UseQueryOptions<SmartFilter[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: attachmentKeys.smartFilters(),
    queryFn: () => attachmentsApi.getSmartFilters(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
}

/**
 * Download attachment mutation
 */
export function useDownloadAttachment() {
  return useMutation({
    mutationFn: (id: string) => attachmentsApi.download(id),
    onError: (error) => {
      console.error('Download failed:', error);
    },
  });
}

/**
 * Reprocess attachment mutation
 */
export function useReprocessAttachment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, priority }: { id: string; priority?: number }) =>
      attachmentsApi.reprocess(id, priority),
    onSuccess: (_, { id }) => {
      // Invalidate the attachment detail query
      queryClient.invalidateQueries({ queryKey: attachmentKeys.detail(id) });
    },
  });
}

/**
 * Search attachments hook (convenience wrapper)
 */
export function useSearchAttachments(
  query: string,
  filters?: Partial<GetAttachmentsParams>
) {
  return useAttachments({
    search: query,
    ...filters,
  });
}

/**
 * Prefetch attachments (for optimization)
 */
export function usePrefetchAttachments() {
  const queryClient = useQueryClient();
  
  return (params?: GetAttachmentsParams) => {
    queryClient.prefetchQuery({
      queryKey: attachmentKeys.list(params),
      queryFn: () => attachmentsApi.list(params),
    });
  };
}

