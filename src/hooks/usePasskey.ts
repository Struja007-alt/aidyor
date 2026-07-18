import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { toast } from "sonner";

export function usePasskey() {
  const [loading, setLoading] = useState(false);

  const isPasskeySupported = (): boolean => {
    return typeof window !== 'undefined' && 
           window.PublicKeyCredential !== undefined &&
           typeof window.PublicKeyCredential === 'function';
  };

  const registerPasskey = async (): Promise<boolean> => {
    if (!isPasskeySupported()) {
      toast.error("Passkeys are not supported on this device");
      return false;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to register a passkey");
        return false;
      }

      // Start registration
      const { data: startData, error: startError } = await supabase.functions.invoke('passkey-register', {
        body: { action: 'start' }
      });

      if (startError || !startData?.options) {
        console.error('Start registration error:', startError || startData);
        toast.error("Failed to start passkey registration");
        return false;
      }

      // Convert options for SimpleWebAuthn
      const options: PublicKeyCredentialCreationOptionsJSON = {
        ...startData.options,
        challenge: startData.challenge,
      };

      // Create credential using browser API
      const credential = await startRegistration({ optionsJSON: options });

      // Complete registration
      const { data: completeData, error: completeError } = await supabase.functions.invoke('passkey-register', {
        body: { 
          action: 'complete',
          credential
        }
      });

      if (completeError || !completeData?.success) {
        console.error('Complete registration error:', completeError || completeData);
        toast.error("Failed to save passkey");
        return false;
      }

      toast.success("Passkey registered successfully!");
      return true;

    } catch (error: any) {
      console.error('Passkey registration error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error("Passkey registration was cancelled");
      } else if (error.name === 'InvalidStateError') {
        toast.error("A passkey already exists for this authenticator");
      } else {
        toast.error("Failed to register passkey");
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const authenticateWithPasskey = async (email: string): Promise<boolean> => {
    if (!isPasskeySupported()) {
      toast.error("Passkeys are not supported on this device");
      return false;
    }

    if (!email) {
      toast.error("Email is required for passkey authentication");
      return false;
    }

    setLoading(true);
    try {
      // Start authentication
      const { data: startData, error: startError } = await supabase.functions.invoke('passkey-authenticate', {
        body: { action: 'start', email }
      });

      if (startError || !startData?.options) {
        console.error('Start auth error:', startError || startData);
        const errorMsg = startData?.error || "Failed to start passkey authentication";
        toast.error(errorMsg);
        return false;
      }

      // Convert options for SimpleWebAuthn
      const options: PublicKeyCredentialRequestOptionsJSON = {
        ...startData.options,
        challenge: startData.challenge,
      };

      // Authenticate using browser API
      const credential = await startAuthentication({ optionsJSON: options });

      // Complete authentication
      const { data: completeData, error: completeError } = await supabase.functions.invoke('passkey-authenticate', {
        body: { 
          action: 'complete',
          email,
          credential
        }
      });

      if (completeError || !completeData?.success) {
        console.error('Complete auth error:', completeError || completeData);
        toast.error("Passkey authentication failed");
        return false;
      }

      // Exchange the token for a session
      if (completeData.token) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: completeData.token,
          type: 'magiclink',
        });

        if (verifyError) {
          console.error('Token verification error:', verifyError);
          toast.error("Failed to complete sign in");
          return false;
        }
      }

      toast.success("Signed in with passkey!");
      return true;

    } catch (error: any) {
      console.error('Passkey authentication error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error("Passkey authentication was cancelled");
      } else {
        toast.error("Failed to authenticate with passkey");
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    isPasskeySupported,
    registerPasskey,
    authenticateWithPasskey,
  };
}