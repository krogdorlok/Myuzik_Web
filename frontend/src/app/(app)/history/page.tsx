import type { Metadata } from "next";
import { HistoryList } from "@/components/history/HistoryList";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold">History</h1>
      <HistoryList />
    </div>
  );
}
