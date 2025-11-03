'use client';

import { useState } from 'react';
import { Mail, Bot, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIAssistantSidebar } from '@/components/ai/AIAssistantSidebar';

interface RightSidebarProps {
  children: React.ReactNode;
}

export function RightSidebarWithTabs({ children }: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState<'inbox' | 'ai'>('inbox');
  const [isAIOpen, setIsAIOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Tab Bar - Modern Design */}
      <div className="h-12 border-b border-border bg-background flex items-center px-1 gap-1">
        <button
          onClick={() => {
            setActiveTab('inbox');
            setIsAIOpen(false);
          }}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2',
            activeTab === 'inbox'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <Mail className="h-4 w-4" />
          <span>Inbox</span>
        </button>
        
        <button
          onClick={() => {
            setActiveTab('ai');
            setIsAIOpen(true);
          }}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2',
            activeTab === 'ai'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <Bot className="h-4 w-4" />
          <span>AI</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Inbox Content */}
        <div className={cn(
          'absolute inset-0 transition-opacity duration-200',
          activeTab === 'inbox' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        )}>
          {children}
        </div>

        {/* AI Assistant Content */}
        <div className={cn(
          'absolute inset-0 transition-opacity duration-200',
          activeTab === 'ai' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        )}>
          {isAIOpen && (
            <div className="h-full w-full">
              <AIAssistantSidebar
                isOpen={true}
                onClose={() => {
                  setActiveTab('inbox');
                  setIsAIOpen(false);
                }}
                fullPage={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

