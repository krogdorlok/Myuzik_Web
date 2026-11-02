import type { Metadata } from "next";
import { TasteProfile } from "@/components/insights/TasteProfile";

export const metadata: Metadata = { title: "Insights" };

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold">Insights</h1>
      <TasteProfile />
    </div>
  );
}
