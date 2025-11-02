'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false); // NEW: Detect if this is from password reset email
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [validation, setValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
    passwordsMatch: false,
  });

  // Check if this is a password reset from email or a logged-in user changing password
  useEffect(() => {
    const checkAuthStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check for reset token in URL (from password reset email)
      const hasResetToken = searchParams.get('token') || searchParams.get('type') === 'recovery';
      
      if (hasResetToken) {
        setIsPasswordReset(true);
        console.log('📧 Password reset flow detected (from email link)');
      } else if (user) {
        setIsLoggedIn(true);
        console.log('🔐 Logged-in user changing password');
      } else {
        // Not logged in and no reset token - redirect to login
        router.push('/login');
      }
    };

    checkAuthStatus();
  }, [searchParams, router]);

  // Real-time password validation
  const validatePassword = (password: string, confirmPassword: string) => {
    setValidation({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(password),
      passwordsMatch: password === confirmPassword && password.length > 0,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Validate as user types
    if (field === 'newPassword' || field === 'confirmPassword') {
      validatePassword(newFormData.newPassword, newFormData.confirmPassword);
    }
  };

  const isFormValid = () => {
    // For password reset (from email), no current password needed
    if (isPasswordReset) {
      return (
        validation.minLength &&
        validation.hasUppercase &&
        validation.hasLowercase &&
        validation.hasNumber &&
        validation.hasSpecial &&
        validation.passwordsMatch
      );
    }
    
    // For logged-in users changing password, require current password
    return (
      formData.currentPassword &&
      validation.minLength &&
      validation.hasUppercase &&
      validation.hasLowercase &&
      validation.hasNumber &&
      validation.hasSpecial &&
      validation.passwordsMatch
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      // SCENARIO 1: Password reset from email (user clicked link in email)
      if (isPasswordReset) {
        console.log('📧 Processing password reset from email...');
        
        // Update password using the reset token from URL
        const { error: updateError } = await supabase.auth.updateUser({
          password: formData.newPassword,
        });

        if (updateError) {
          setError(updateError.message);
          setLoading(false);
          return;
        }

        // Get user after password update
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Update user record in database
          await fetch('/api/auth/password-changed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          });
        }

        setSuccess(true);
        
        // Redirect to login after success
        setTimeout(() => {
          router.push('/login?message=Password reset successful! Please log in with your new password.');
        }, 2000);
        
        return;
      }

      // SCENARIO 2: Logged-in user changing password with temp password
      console.log('🔐 Processing logged-in user password change...');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError('Unable to verify your identity. Please log in again.');
        setLoading(false);
        return;
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: formData.currentPassword,
      });

      if (signInError) {
        setError('Current password is incorrect');
        setLoading(false);
        return;
      }

      // Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Update user record in database
      const response = await fetch('/api/auth/password-changed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        console.error('Failed to update user record');
      }

      setSuccess(true);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/inbox');
      }, 2000);

    } catch (err: any) {
      console.error('Password change error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Password Changed!</CardTitle>
            <CardDescription>
              Your password has been successfully updated. Redirecting you to your inbox...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">
            {isPasswordReset ? 'Set New Password' : 'Change Your Password'}
          </CardTitle>
          <CardDescription>
            {isPasswordReset 
              ? 'Please create a strong new password for your account.'
              : 'For security, you must change your temporary password before continuing.'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password - Only show for logged-in users, not for password reset */}
            {!isPasswordReset && (
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    placeholder="Enter your temporary password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            {formData.newPassword && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium text-gray-700">Password Requirements:</p>
                <div className="space-y-1 text-sm">
                  <div className={`flex items-center gap-2 ${validation.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center ${validation.minLength ? 'bg-green-100' : 'bg-gray-200'}`}>
                      {validation.minLength && <CheckCircle className="h-3 w-3" />}
                    </div>
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-2 ${validation.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center ${validation.hasUppercase ? 'bg-green-100' : 'bg-gray-200'}`}>
                      {validation.hasUppercase && <CheckCircle className="h-3 w-3" />}
                    </div>
                    One uppercase letter
                  </div>
                  <div className={`flex items-center gap-2 ${validation.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center ${validation.hasLowercase ? 'bg-green-100' : 'bg-gray-200'}`}>
                      {validation.hasLowercase && <CheckCircle className="h-3 w-3" />}
                    </div>
                    One lowercase letter
                  </div>
                  <div className={`flex items-center gap-2 ${validation.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center ${validation.hasNumber ? 'bg-green-100' : 'bg-gray-200'}`}>
                      {validation.hasNumber && <CheckCircle className="h-3 w-3" />}
                    </div>
                    One number
                  </div>
                  <div className={`flex items-center gap-2 ${validation.hasSpecial ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center ${validation.hasSpecial ? 'bg-green-100' : 'bg-gray-200'}`}>
                      {validation.hasSpecial && <CheckCircle className="h-3 w-3" />}
                    </div>
                    One special character (!@#$%^&*)
                  </div>
                  <div className={`flex items-center gap-2 ${validation.passwordsMatch ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center ${validation.passwordsMatch ? 'bg-green-100' : 'bg-gray-200'}`}>
                      {validation.passwordsMatch && <CheckCircle className="h-3 w-3" />}
                    </div>
                    Passwords match
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !isFormValid()}
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </Button>

            <p className="text-xs text-center text-gray-500">
              You'll be redirected to your inbox after changing your password
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

