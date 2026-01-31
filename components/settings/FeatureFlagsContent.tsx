'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useFeatureFlags } from '@/lib/stores/useFeatureFlags';
import { Beaker, RotateCcw, AlertCircle } from 'lucide-react';

export function FeatureFlagsContent() {
  const { useEmailRendererV3, toggleFeature, resetToDefaults, loadFromAPI } = useFeatureFlags();

  // Load feature flags from API on mount
  useEffect(() => {
    loadFromAPI();
  }, [loadFromAPI]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Feature Flags</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enable experimental features and improvements. These features are being tested and may have issues.
        </p>
      </div>

      {/* Warning */}
      <Card className="p-4 bg-muted border-border">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              Experimental Features
            </p>
            <p className="text-muted-foreground mt-1">
              These features are currently in testing. They may have bugs or incomplete functionality. Use at your own risk.
            </p>
          </div>
        </div>
      </Card>

      {/* Feature Flags */}
      <div className="space-y-4">
        {/* V3 Email Renderer */}
        <Card className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Beaker className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">V3 Email Renderer</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    Beta
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  New email rendering system with iframe isolation for better CSS compatibility and security.
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-primary font-medium">Improvements:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground ml-2">
                    <li>Complete CSS isolation - no more layout conflicts</li>
                    <li>Better attachment download with progress tracking</li>
                    <li>Improved error messages for troubleshooting</li>
                    <li>More accurate email rendering matching original sender</li>
                  </ul>
                </div>
              </div>
            </div>
            <Switch
              checked={useEmailRendererV3}
              onCheckedChange={() => toggleFeature('useEmailRendererV3')}
            />
          </div>
        </Card>

        {/* Future features can be added here */}
      </div>

      {/* Reset Button */}
      <Card className="p-4 border-dashed">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Reset All Flags</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Disable all experimental features and return to defaults
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </Card>
    </div>
  );
}
