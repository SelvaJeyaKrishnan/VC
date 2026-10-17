import { Suspense } from "react";
import { DashboardLayout } from "@/components/studio/DashboardLayout";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0c10] text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <span className="text-xs font-mono">Loading OneGuest Studio Workspace...</span>
          </div>
        </div>
      }
    >
      <DashboardLayout />
    </Suspense>
  );
}
