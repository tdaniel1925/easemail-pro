import { Metadata } from 'next';
import UserBillingPage from '@/components/billing/UserBillingPage';

export const metadata: Metadata = {
  title: 'Usage & Billing',
  description: 'View your usage and billing information',
};

export default function BillingPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <UserBillingPage />
    </div>
  );
}
