'use client';

/**
 * MS Teams Page
 * Full-featured Teams integration interface
 */

import { TeamsPanel } from '@/components/ms-teams/TeamsPanel';

export default function TeamsPage() {
  return (
    <div className="h-[calc(100vh-60px)]">
      <TeamsPanel className="h-full" />
    </div>
  );
}
