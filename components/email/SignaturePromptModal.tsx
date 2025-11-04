/**
 * SignaturePromptModal Component
 * 
 * One-time prompt to help users create a signature
 * Features:
 * - Shows when user tries to send without a signature
 * - "Never show again" option
 * - Links to signature creation page
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PenTool } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SignaturePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueWithoutSignature: () => void;
  onNeverShowAgain: () => void;
}

export function SignaturePromptModal({
  isOpen,
  onClose,
  onContinueWithoutSignature,
  onNeverShowAgain,
}: SignaturePromptModalProps) {
  const router = useRouter();
  const [neverShow, setNeverShow] = useState(false);

  const handleCreateSignature = () => {
    // Navigate to signatures page
    router.push('/settings/signatures');
    onClose();
  };

  const handleContinue = () => {
    if (neverShow) {
      onNeverShowAgain();
    }
    onContinueWithoutSignature();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <PenTool className="h-6 w-6 text-primary" />
            </div>
            <span>Add Your Email Signature?</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Make your emails more professional
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            You haven't set up an email signature yet. Email signatures help establish your professional identity and make it easy for recipients to contact you.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">A good signature includes:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Your full name and title</li>
              <li>• Contact information</li>
              <li>• Company name (if applicable)</li>
              <li>• Professional social links</li>
            </ul>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="never-show"
              checked={neverShow}
              onCheckedChange={(checked) => setNeverShow(checked === true)}
            />
            <label
              htmlFor="never-show"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Don't show this again
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleContinue}
          >
            Continue Without Signature
          </Button>
          <Button
            onClick={handleCreateSignature}
            className="gap-2"
          >
            <PenTool className="h-4 w-4" />
            Create Signature Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

