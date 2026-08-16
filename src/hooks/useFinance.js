import { supabase } from "@/integrations/supabase/client";
import { useDataQuery, useDataMutation, invalidateQueries } from "@/hooks/useDataQuery";

const db = supabase;

async function uid() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id;
}

export function useProfile() {
  return useDataQuery("profile", async () => {
    await db.rpc("ensure_user_setup");
    const { data, error } = await db.from("profiles").select("*").maybeSingle();
    if (error) throw error;
    return data;
  });
}

export function useCategories() {
  return useDataQuery("categories", async () => {
    const { data, error } = await db.from("categories").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  });
}

export function useItems() {
  return useDataQuery("items", async () => {
    const { data, error } = await db.from("items").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  });
}

export function useTransactions() {
  return useDataQuery("transactions", async () => {
    const { data, error } = await db
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((t) => ({ ...t, amount: Number(t.amount) }));
  });
}

export function useBudgets() {
  return useDataQuery("budgets", async () => {
    const { data, error } = await db.from("budgets").select("*");
    if (error) throw error;
    return (data ?? []).map((b) => ({ ...b, amount: Number(b.amount) }));
  });
}

export function useRecurringTransactions() {
  return useDataQuery("recurring_transactions", async () => {
    const { data, error } = await db.from("recurring_transactions").select("*").order("next_date");
    if (error) throw error;
    return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) }));
  });
}

export function useSaveTransaction() {
  return useDataMutation(
    async (payload) => {
      const user_id = await uid();
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await db.from("transactions").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.from("transactions").insert({ ...payload, user_id });
        if (error) throw error;
      }
      if (payload.item_id) {
        const { data } = await db
          .from("items")
          .select("usage_count")
          .eq("id", payload.item_id)
          .maybeSingle();
        await db
          .from("items")
          .update({
            usage_count: Number(data?.usage_count ?? 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", payload.item_id);
      }
    },
    { onSuccess: () => invalidateQueries(["transactions", "items"]) },
  );
}

export function useDeleteTransaction() {
  return useDataMutation(
    async (id) => {
      const { error } = await db.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    { onSuccess: () => invalidateQueries(["transactions"]) },
  );
}

export function useAddCategory() {
  return useDataMutation(
    async ({ name, type }) => {
      const user_id = await uid();
      const { data, error } = await db
        .from("categories")
        .insert({ name, type, user_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    { onSuccess: () => invalidateQueries(["categories"]) },
  );
}

export function useAddItem() {
  return useDataMutation(
    async ({ name, category_id }) => {
      const user_id = await uid();
      const { data, error } = await db
        .from("items")
        .insert({ name, category_id, user_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    { onSuccess: () => invalidateQueries(["items"]) },
  );
}

export function useUpdateRow(table, keys) {
  return useDataMutation(
    async ({ id, values }) => {
      const { error } = await db.from(table).update(values).eq("id", id);
      if (error) throw error;
    },
    { onSuccess: () => invalidateQueries(keys) },
  );
}

export function useDeleteRow(table, keys) {
  return useDataMutation(
    async (id) => {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    { onSuccess: () => invalidateQueries(keys) },
  );
}

export function useInsertRow(table, keys) {
  return useDataMutation(
    async (values) => {
      const user_id = await uid();
      const { error } = await db.from(table).insert({ ...values, user_id });
      if (error) throw error;
    },
    { onSuccess: () => invalidateQueries(keys) },
  );
}

export function useUpsertBudget() {
  return useDataMutation(
    async (values) => {
      const user_id = await uid();
      const { error } = await db
        .from("budgets")
        .upsert({ ...values, user_id }, { onConflict: "user_id,category_id,month" });
      if (error) throw error;
    },
    { onSuccess: () => invalidateQueries(["budgets"]) },
  );
}
