import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { invalidateQueries } from "@/hooks/useDataQuery";

// Maps each realtime-enabled table (see the matching migration,
// 20260817120000_enable_realtime_sync.sql) to the useDataQuery key(s) it
// should invalidate when a row changes. Kept as table -> keys (rather than
// assuming table name === query key) in case a table ever needs to feed
// more than one cached key.
const TABLE_TO_KEYS = {
  profiles: ["profile"],
  categories: ["categories"],
  items: ["items"],
  payment_methods: ["payment_methods"],
  transactions: ["transactions"],
  budgets: ["budgets"],
  recurring_transactions: ["recurring_transactions"],
  account_transfers: ["account_transfers"],
};

// Column each table is scoped by. Every table uses user_id except profiles,
// which is keyed by its own id (see the profiles table definition). RLS
// already enforces this server-side; filtering here just keeps each
// channel's payloads limited to this user's own rows.
const TABLE_FILTER_COLUMN = {
  profiles: "id",
};

/**
 * Subscribes to Postgres changes (Supabase Realtime) for every user-owned
 * table and invalidates the matching useDataQuery cache key whenever a row
 * is inserted, updated, or deleted — from THIS tab or from any other
 * tab/device signed in to the same account.
 *
 * This is what makes a transfer (or any other change) made on one
 * phone/tab show up live on another phone/tab that's already open, instead
 * of only updating once that tab is backgrounded and refocused (which is
 * all the visibility/focus revalidation in useDataQuery.js can do for a
 * change that happened somewhere else).
 *
 * Mounted once near the root of the authenticated app (ProtectedLayout) so
 * the subscription survives navigation between pages instead of being torn
 * down and rebuilt per page.
 */
export function useRealtimeSync() {
  const { user } = useAuth();
  const userId = user?.id;
  const channelsRef = useRef([]);

  useEffect(() => {
    if (!userId) return undefined;

    const channels = Object.entries(TABLE_TO_KEYS).map(([table, keys]) => {
      const filterColumn = TABLE_FILTER_COLUMN[table] ?? "user_id";
      return supabase
        .channel(`sync:${table}:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `${filterColumn}=eq.${userId}`,
          },
          () => invalidateQueries(keys),
        )
        .subscribe();
    });

    channelsRef.current = channels;
    return () => {
      channelsRef.current.forEach((channel) => supabase.removeChannel(channel));
      channelsRef.current = [];
    };
  }, [userId]);
}
