'use client';

import * as React from 'react';
import {
  Panel,
  Group,
  Separator,
} from 'react-resizable-panels';
import { cn } from '@/lib/utils';

interface ResizableLayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  rightPanel?: React.ReactNode;
  defaultSidebarSize?: number;
  defaultRightPanelSize?: number;
  minSidebarSize?: number;
  minMainSize?: number;
  minRightPanelSize?: number;
  className?: string;
}

export function ResizableLayout({
  sidebar,
  main,
  rightPanel,
  defaultSidebarSize = 20,
  defaultRightPanelSize = 25,
  minSidebarSize = 15,
  minMainSize = 30,
  minRightPanelSize = 20,
  className,
}: ResizableLayoutProps) {
  return (
    <div className={cn('h-screen w-full', className)}>
      <Group orientation="horizontal" className="h-full">
        {/* Sidebar Panel */}
        <Panel
          defaultSize={defaultSidebarSize}
          minSize={minSidebarSize}
          maxSize={30}
          collapsible
          className="relative"
        >
          {sidebar}
        </Panel>

        {/* Resize Handle */}
        <Separator className="w-[1px] bg-border hover:bg-terminal-blue transition-colors data-[resize-handle-state=drag]:bg-terminal-blue relative group">
          <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
        </Separator>

        {/* Main Content Panel */}
        <Panel minSize={minMainSize} className="relative">
          {rightPanel ? (
            <Group orientation="horizontal">
              <Panel minSize={minMainSize} className="relative">
                {main}
              </Panel>

              {/* Right Panel Resize Handle */}
              <Separator className="w-[1px] bg-border hover:bg-terminal-blue transition-colors data-[resize-handle-state=drag]:bg-terminal-blue relative group">
                <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
              </Separator>

              {/* Right Panel */}
              <Panel
                defaultSize={defaultRightPanelSize}
                minSize={minRightPanelSize}
                maxSize={40}
                collapsible
                className="relative"
              >
                {rightPanel}
              </Panel>
            </Group>
          ) : (
            main
          )}
        </Panel>
      </Group>
    </div>
  );
}

export default ResizableLayout;
