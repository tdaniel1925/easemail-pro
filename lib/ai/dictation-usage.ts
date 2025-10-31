/**
 * Dictation Usage Tracking and Management
 * 
 * Tracks user's dictation time and enforces limits
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DictationUsage {
  dailyMinutes: number;
  monthlyMinutes: number;
  lastResetDate: string;
  totalMinutesUsed: number;
}

interface DictationStore {
  usage: DictationUsage;
  tier: 'free' | 'pro' | 'business';
  
  // Actions
  addMinutes: (minutes: number) => void;
  resetDaily: () => void;
  resetMonthly: () => void;
  setTier: (tier: 'free' | 'pro' | 'business') => void;
  canUseDictation: () => boolean;
  getRemainingMinutes: () => { daily: number; monthly: number };
}

// Tier limits
const LIMITS = {
  free: {
    daily: 10,
    monthly: 30,
  },
  pro: {
    daily: 100,
    monthly: 300,
  },
  business: {
    daily: Infinity,
    monthly: Infinity,
  },
};

export const useDictationStore = create<DictationStore>()(
  persist(
    (set, get) => ({
      usage: {
        dailyMinutes: 0,
        monthlyMinutes: 0,
        lastResetDate: new Date().toISOString().split('T')[0],
        totalMinutesUsed: 0,
      },
      tier: 'free',

      addMinutes: (minutes: number) => {
        const state = get();
        
        // Check if we need to reset
        const today = new Date().toISOString().split('T')[0];
        if (state.usage.lastResetDate !== today) {
          state.resetDaily();
        }

        set({
          usage: {
            ...state.usage,
            dailyMinutes: state.usage.dailyMinutes + minutes,
            monthlyMinutes: state.usage.monthlyMinutes + minutes,
            totalMinutesUsed: state.usage.totalMinutesUsed + minutes,
          },
        });
      },

      resetDaily: () => {
        const state = get();
        set({
          usage: {
            ...state.usage,
            dailyMinutes: 0,
            lastResetDate: new Date().toISOString().split('T')[0],
          },
        });
      },

      resetMonthly: () => {
        const state = get();
        set({
          usage: {
            ...state.usage,
            monthlyMinutes: 0,
          },
        });
      },

      setTier: (tier: 'free' | 'pro' | 'business') => {
        set({ tier });
      },

      canUseDictation: () => {
        const state = get();
        const limits = LIMITS[state.tier];
        
        return (
          state.usage.dailyMinutes < limits.daily &&
          state.usage.monthlyMinutes < limits.monthly
        );
      },

      getRemainingMinutes: () => {
        const state = get();
        const limits = LIMITS[state.tier];
        
        return {
          daily: Math.max(0, limits.daily - state.usage.dailyMinutes),
          monthly: Math.max(0, limits.monthly - state.usage.monthlyMinutes),
        };
      },
    }),
    {
      name: 'dictation-usage',
    }
  )
);

/**
 * React Hook for dictation usage
 */
export function useDictationUsage() {
  const store = useDictationStore();
  
  return {
    usage: store.usage,
    tier: store.tier,
    canUse: store.canUseDictation(),
    remaining: store.getRemainingMinutes(),
    addMinutes: store.addMinutes,
    setTier: store.setTier,
  };
}

/**
 * API Helper - Track usage on backend
 */
export async function trackDictationUsage(userId: string, minutes: number) {
  try {
    const response = await fetch('/api/usage/dictation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, minutes }),
    });
    
    if (!response.ok) {
      console.error('Failed to track dictation usage');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error tracking dictation usage:', error);
  }
}

/**
 * API Helper - Get user's current usage
 */
export async function getDictationUsage(userId: string) {
  try {
    const response = await fetch(`/api/usage/dictation?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch usage');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching dictation usage:', error);
    return null;
  }
}

/**
 * Format minutes for display
 */
export function formatMinutes(minutes: number): string {
  if (minutes === Infinity) {
    return 'Unlimited';
  }
  
  if (minutes < 1) {
    return `${Math.round(minutes * 60)} seconds`;
  }
  
  return `${Math.round(minutes)} minutes`;
}

/**
 * Get tier display name
 */
export function getTierName(tier: 'free' | 'pro' | 'business'): string {
  const names = {
    free: 'Free',
    pro: 'Pro',
    business: 'Business',
  };
  return names[tier];
}

/**
 * Get tier color
 */
export function getTierColor(tier: 'free' | 'pro' | 'business'): string {
  const colors = {
    free: 'text-gray-600',
    pro: 'text-blue-600',
    business: 'text-purple-600',
  };
  return colors[tier];
}

