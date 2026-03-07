"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
  type OnChangeFn,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { Contact } from "@/lib/contacts/types";
import { ArrowUpDown } from "lucide-react";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

interface ContactsTableProps {
  contacts: Contact[];
  loading: boolean;
  onRowClick: (id: string) => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  sortBy?: string;
  sortOrder?: string;
  onSort: (column: string) => void;
}

export function ContactsTable({
  contacts,
  loading,
  onRowClick,
  rowSelection,
  onRowSelectionChange,
  sortBy,
  sortOrder,
  onSort,
}: ContactsTableProps) {
  const columns: ColumnDef<Contact>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="h-3.5 w-3.5 rounded border-border accent-foreground"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 rounded border-border accent-foreground"
        />
      ),
      size: 40,
      enableSorting: false,
    },
    {
      accessorKey: "email",
      header: () => (
        <button onClick={() => onSort("email")} className="flex items-center gap-1">
          Contact
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
        </button>
      ),
      cell: ({ row }) => {
        const name = [row.original.firstName, row.original.lastName].filter(Boolean).join(" ");
        return (
          <div className="min-w-0">
            {name && <p className="truncate text-[13px] font-medium text-foreground">{name}</p>}
            <p className={cn("truncate text-[12px]", name ? "text-muted-foreground" : "text-foreground")}>
              {row.original.email}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "company",
      header: () => (
        <button onClick={() => onSort("company")} className="flex items-center gap-1">
          Company
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-[12px] text-muted-foreground">{row.original.company || "—"}</span>
      ),
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags;
        if (!tags?.length) return <span className="text-[12px] text-muted-foreground/50">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {tags.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{tags.length - 2}</span>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "subscribed",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              row.original.subscribed ? "bg-foreground" : "bg-muted-foreground/30"
            )}
          />
          <span className="text-[11px] text-muted-foreground">
            {row.original.subscribed ? "Subscribed" : "Unsubscribed"}
          </span>
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
          {row.original.source}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "createdAt",
      header: () => (
        <button onClick={() => onSort("createdAt")} className="flex items-center gap-1">
          Added
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-[12px] text-muted-foreground whitespace-nowrap">
          {formatRelativeDate(row.original.createdAt)}
        </span>
      ),
    },
  ];

  const table = useReactTable({
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange,
    state: { rowSelection },
    getRowId: (row) => row.id,
    enableRowSelection: true,
  });

  if (loading && contacts.length === 0) {
    return <TableSkeleton rows={8} cols={6} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="h-9 px-3 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground first:pl-4 last:pr-4"
                  style={header.column.getSize() !== 150 ? { width: header.column.getSize() } : undefined}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick(row.original.id)}
              className={cn(
                "h-[42px] border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-muted/30",
                row.getIsSelected() && "bg-muted/50"
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 first:pl-4 last:pr-4">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && contacts.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <p className="text-[13px] text-muted-foreground">No contacts match your filters.</p>
        </div>
      )}
    </div>
  );
}
