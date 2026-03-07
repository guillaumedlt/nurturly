"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Contact, ContactsListParams, ContactsListResponse } from "./types";

export function useContacts(initialParams?: Partial<ContactsListParams>) {
  const [data, setData] = useState<ContactsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<ContactsListParams>({
    page: 1,
    pageSize: 50,
    sortBy: "createdAt",
    sortOrder: "desc",
    ...initialParams,
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchContacts = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        qs.set(key, String(value));
      }
    }

    try {
      const res = await fetch(`/api/contacts?${qs}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to fetch contacts");
      const json: ContactsListResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const updateParams = useCallback((updates: Partial<ContactsListParams>) => {
    setParams((prev) => ({
      ...prev,
      ...updates,
      page: "page" in updates ? updates.page! : 1,
    }));
  }, []);

  return {
    contacts: data?.contacts ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? 50,
    totalPages: data?.totalPages ?? 0,
    loading,
    error,
    params,
    updateParams,
    refetch: fetchContacts,
  };
}
