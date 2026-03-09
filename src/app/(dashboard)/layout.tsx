import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { Toaster } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: "text-[13px]",
          duration: 3000,
        }}
      />
    </div>
  );
}
