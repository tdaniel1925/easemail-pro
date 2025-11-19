/**
 * Stats Section - Show key metrics
 */

'use client';

export default function StatsSection() {
  const stats = [
    { label: 'Active Users', value: '50,000+' },
    { label: 'Emails Processed', value: '10M+' },
    { label: 'Time Saved Daily', value: '2+ hours' },
    { label: 'Customer Satisfaction', value: '98%' },
  ];

  return (
    <section className="border-y bg-muted/30 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

