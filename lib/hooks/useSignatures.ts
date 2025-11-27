/**
 * React Hook for Managing Email Signatures
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EmailSignature } from '@/lib/signatures/types';
import { SignatureService } from '@/lib/signatures/signature-service';

export function useSignatures() {
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSignatures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/signatures');
      if (!response.ok) {
        throw new Error('Failed to fetch signatures');
      }
      const data = await response.json();
      setSignatures(data.signatures || []);
    } catch (err) {
      console.error('Error loading signatures:', err);
      setError(err instanceof Error ? err.message : 'Failed to load signatures');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSignatures();
  }, [loadSignatures]);

  const getDefaultSignature = useCallback((): EmailSignature | null => {
    // First try to find the default signature
    const defaultSig = signatures.find(sig => sig.isDefault && sig.isActive);
    if (defaultSig) return defaultSig;

    // Fall back to first active signature if no default is set
    const firstActive = signatures.find(sig => sig.isActive);
    return firstActive || null;
  }, [signatures]);

  const getSignatureForAccount = useCallback((accountId: string): EmailSignature | null => {
    // Try to find account-specific signature first
    const accountSignature = signatures.find(
      sig => sig.accountId === accountId && sig.isActive
    );
    if (accountSignature) return accountSignature;

    // Fall back to default signature
    return getDefaultSignature();
  }, [signatures, getDefaultSignature]);

  const getApplicableSignature = useCallback((
    type: 'compose' | 'reply' | 'reply-all' | 'forward',
    accountId?: string
  ): EmailSignature | null => {
    const signature = accountId 
      ? getSignatureForAccount(accountId)
      : getDefaultSignature();

    if (!signature) return null;

    // Check if signature should be used for this email type
    if (type === 'reply' || type === 'reply-all') {
      if (!signature.useForReplies) return null;
    }

    if (type === 'forward') {
      if (!signature.useForForwards) return null;
    }

    return signature;
  }, [getSignatureForAccount, getDefaultSignature]);

  const renderSignature = useCallback((
    signature: EmailSignature,
    user?: any,
    account?: any
  ): string => {
    const context = SignatureService.getSignatureContext(user, account);
    return SignatureService.replaceVariables(signature.contentHtml, context);
  }, []);

  return {
    signatures,
    loading,
    error,
    loadSignatures,
    getDefaultSignature,
    getSignatureForAccount,
    getApplicableSignature,
    renderSignature,
  };
}

