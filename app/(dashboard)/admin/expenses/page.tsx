import { Metadata } from 'next';
import ExpenseDashboard from '@/components/admin/ExpenseDashboard';

export const metadata: Metadata = {
  title: 'Expense Analytics | Admin',
  description: 'Track and analyze expenses across all services',
};

export default function ExpensesPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <ExpenseDashboard />
    </div>
  );
}

