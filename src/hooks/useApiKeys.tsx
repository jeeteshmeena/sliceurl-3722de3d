import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  status: 'active' | 'revoked';
  rate_limit_daily: number;
  requests_today: number;
  rate_limit_reset_at: string;
  created_at: string;
  revoked_at: string | null;
  last_request_at: string | null;
}

export interface ApiUsage {
  requests_used: number;
  requests_limit: number;
  requests_remaining: number;
  reset_at: string;
}

export function useApiKeys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<ApiUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUsage = useCallback(async () => {
    if (!user) return;

    // Calculate usage from keys
    const activeKeys = keys.filter(k => k.status === 'active');
    const totalRequests = activeKeys.reduce((sum, k) => sum + k.requests_today, 0);
    const totalLimit = activeKeys.reduce((sum, k) => sum + k.rate_limit_daily, 0);
    
    setUsage({
      requests_used: totalRequests,
      requests_limit: totalLimit || 1000,
      requests_remaining: Math.max(0, (totalLimit || 1000) - totalRequests),
      reset_at: new Date().toISOString(),
    });
  }, [user, keys]);

  const createKey = useCallback(async (name?: string): Promise<{ api_key?: string; error?: string }> => {
    if (!user) return { error: 'Not authenticated' };

    setCreating(true);
    try {
      // Use secure edge function for API key creation with SHA-256 hashing
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return { error: 'No active session' };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys?action=create`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: name || 'API Key' })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to create API key' };
      }

      await fetchKeys();
      return { api_key: result.api_key };
    } catch (error) {
      console.error('Error creating API key:', error);
      return { error: 'Failed to create API key' };
    } finally {
      setCreating(false);
    }
  }, [user, fetchKeys]);

  const revokeKey = useCallback(async (keyId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Use secure edge function for API key revocation
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return false;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys?action=revoke`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ key_id: keyId })
        }
      );

      if (!response.ok) {
        return false;
      }

      await fetchKeys();
      return true;
    } catch (error) {
      console.error('Error revoking API key:', error);
      return false;
    }
  }, [user, fetchKeys]);

  const deleteKey = useCallback(async (keyId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Use secure edge function for API key deletion
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return false;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys?action=delete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ key_id: keyId })
        }
      );

      if (!response.ok) {
        return false;
      }

      await fetchKeys();
      return true;
    } catch (error) {
      console.error('Error deleting API key:', error);
      return false;
    }
  }, [user, fetchKeys]);

  useEffect(() => {
    if (user) {
      fetchKeys();
    }
  }, [user, fetchKeys]);

  useEffect(() => {
    fetchUsage();
  }, [keys, fetchUsage]);

  return {
    keys,
    usage,
    loading,
    creating,
    createKey,
    revokeKey,
    deleteKey,
    refresh: () => {
      fetchKeys();
    }
  };
}
