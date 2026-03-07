"use client";

import { useState, useMemo } from "react";
import { Plus, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useContacts } from "@/lib/contacts/use-contacts";
import { ContactsTable } from "./contacts-table";
import { ContactsToolbar } from "./contacts-toolbar";
import { ContactsPagination } from "./contacts-pagination";
import { AddContactDialog } from "./add-contact-dialog";
import { ImportDialog } from "./import-dialog";
import { ContactDetailSheet } from "./contact-detail-sheet";
import type { RowSelectionState } from "@tanstack/react-table";

export function ContactsPageClient() {
  const { contacts, total, page, pageSize, totalPages, loading, params, updateParams, refetch } = useContacts();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const selectedIds = useMemo(() => Object.keys(rowSelection).filter((k) => rowSelection[k]), [rowSelection]);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    await fetch("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", contactIds: selectedIds }),
    });
    setRowSelection({});
    refetch();
  };

  const handleSort = (column: string) => {
    if (params.sortBy === column) {
      updateParams({ sortBy: column, sortOrder: params.sortOrder === "asc" ? "desc" : "asc", page });
    } else {
      updateParams({ sortBy: column as typeof params.sortBy, sortOrder: "asc", page });
    }
  };

  const hasAnyData = total > 0 || params.search || params.subscribed || params.source;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Contacts</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {total > 0 ? `${total} contact${total !== 1 ? "s" : ""}` : "Manage your audience and subscribers."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import
          </Button>
          <Button size="sm" className="h-8 text-[12px]" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add contact
          </Button>
        </div>
      </div>

      {hasAnyData ? (
        <>
          <ContactsToolbar
            params={params}
            onParamsChange={updateParams}
            selectedCount={selectedIds.length}
            onBulkDelete={handleBulkDelete}
          />
          <div className="rounded-lg border border-border">
            <ContactsTable
              contacts={contacts}
              loading={loading}
              onRowClick={(id) => setSelectedContactId(id)}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              sortBy={params.sortBy}
              sortOrder={params.sortOrder}
              onSort={handleSort}
            />
            <ContactsPagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              onPageChange={(p) => updateParams({ page: p })}
            />
          </div>
        </>
      ) : loading ? (
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add contacts manually, import a CSV file, or connect an integration to sync your audience."
            actionLabel="Import contacts"
            onAction={() => setImportOpen(true)}
          />
        </div>
      )}

      <AddContactDialog open={addOpen} onOpenChange={setAddOpen} onCreated={refetch} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={refetch} />
      <ContactDetailSheet
        contactId={selectedContactId}
        open={!!selectedContactId}
        onOpenChange={(open) => { if (!open) setSelectedContactId(null); }}
        onUpdated={refetch}
        onDeleted={() => { setSelectedContactId(null); refetch(); }}
      />
    </div>
  );
}
