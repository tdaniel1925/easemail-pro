/**
 * Teams Connect Button Component
 * Button to initiate Teams OAuth connection
 */

'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Microsoft Teams logo as SVG
const TeamsLogo = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5"
  >
    <path d="M20.625 8.25h-6.75a1.125 1.125 0 00-1.125 1.125v6.75c0 .621.504 1.125 1.125 1.125h6.75c.621 0 1.125-.504 1.125-1.125v-6.75a1.125-1.125 0 00-1.125-1.125z" />
    <path d="M17.25 6.75a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zM11.25 8.25a2.625 2.625 0 100-5.25 2.625 2.625 0 000 5.25z" />
    <path d="M2.25 11.625v5.625c0 .621.504 1.125 1.125 1.125h9c.621 0 1.125-.504 1.125-1.125v-5.625a1.125-1.125 0 00-1.125-1.125h-9a1.125 1.125 0 00-1.125 1.125z" />
  </svg>
);

interface TeamsConnectButtonProps {
  onConnected?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function TeamsConnectButton({
  onConnected,
  variant = 'default',
  size = 'default',
  className,
}: TeamsConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);

      // Get the auth URL from the server
      const response = await fetch('/api/teams/auth');
      const data = await response.json();

      if (data.error) {
        console.error('Teams auth error:', data.error);
        alert(`Failed to connect Teams: ${data.error}`);
        return;
      }

      if (data.authUrl) {
        // Redirect to Microsoft OAuth
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error connecting Teams:', error);
      alert('Failed to connect to Microsoft Teams. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      variant={variant}
      size={size}
      className={className}
      style={{
        backgroundColor: variant === 'default' ? '#6264A7' : undefined,
      }}
    >
      {isConnecting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <TeamsLogo />
      )}
      <span className="ml-2">
        {isConnecting ? 'Connecting...' : 'Connect Microsoft Teams'}
      </span>
    </Button>
  );
}
