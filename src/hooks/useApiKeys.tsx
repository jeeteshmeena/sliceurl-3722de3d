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

  const callApiKeyAction = useCallback(async <T = Record<string, unknown>>(
    action: string,
    body?: Record<string, unknown>
  ): Promise<{ data?: T; error?: string }> => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { error: "No active session" };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys?action=${action}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body ?? {}),
      }
    );

    const text = await response.text();
    const result = text ? JSON.parse(text) : {};

    if (!response.ok) {
      return { error: result.error || `Request failed (${response.status})` };
    }

    return { data: result as T };
  }, []);

  const fetchKeys = useCallback(async () => {
    if (!user) {
      setKeys([]);
      setUsage(null);
      setLoading(false);
      return;
    }

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
    if (!user) {
      setUsage(null);
      return;
    }

    // Calculate usage from keys
    const activeKeys = keys.filter(k => k.status === 'active');
    const totalRequests = activeKeys.reduce((sum, k) => sum + k.requests_today, 0);
    const totalLimit = activeKeys.reduce((sum, k) => sum + k.rate_limit_daily, 0);
    
    setUsage({
      requests_used: totalRequests,
      requests_limit: totalLimit || 1000,
      requests_remaining: Math.max(0, (totalLimit || 1000) - totalRequests),
      reset_at: activeKeys[0]?.rate_limit_reset_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }, [user, keys]);

  const createKey = useCallback(async (name?: string): Promise<{ api_key?: string; error?: string }> => {
    if (!user) return { error: 'Not authenticated' };

    setCreating(true);
    try {
      const { data, error } = await callApiKeyAction<{ api_key?: string }>("create", {
        name: name || "API Key",
      });

      if (error) {
        return { error };
      }

      await fetchKeys();
      return { api_key: data?.api_key };
    } catch (error) {
      console.error('Error creating API key:', error);
      return { error: 'Failed to create API key' };
    } finally {
      setCreating(false);
    }
  }, [user, fetchKeys, callApiKeyAction]);

  const revokeKey = useCallback(async (keyId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await callApiKeyAction("revoke", { key_id: keyId });
      if (error) {
        return false;
      }

      await fetchKeys();
      return true;
    } catch (error) {
      console.error('Error revoking API key:', error);
      return false;
    }
  }, [user, fetchKeys, callApiKeyAction]);

  const deleteKey = useCallback(async (keyId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await callApiKeyAction("delete", { key_id: keyId });
      if (error) {
        return false;
      }

      await fetchKeys();
      return true;
    } catch (error) {
      console.error('Error deleting API key:', error);
      return false;
    }
  }, [user, fetchKeys, callApiKeyAction]);

  useEffect(() => {
    if (user) {
      fetchKeys();
    } else {
      setKeys([]);
      setUsage(null);
      setLoading(false);
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
