"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import type { TasteProfile } from "@/types";

export default function InsightsPage() {
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/proxy/insights/taste-profile");
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (isLoading) {
    return <div className="text-center text-muted">Loading insights...</div>;
  }

  if (!profile || profile.total_analyses === 0) {
    return (
      <Card className="text-center py-12">
        <p className="text-muted">Not enough data yet. Upload more music!</p>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-display font-extrabold text-text mb-8">
        Your Taste Profile
      </h1>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="text-center">
          <p className="text-4xl font-display font-extrabold text-accent">
            {profile.total_analyses}
          </p>
          <p className="text-muted">Total analyses</p>
        </Card>

        <Card className="text-center">
          <p className="text-4xl font-display font-extrabold text-accent capitalize">
            {profile.top_genre}
          </p>
          <p className="text-muted">Top genre</p>
        </Card>

        <Card className="text-center">
          <p className="text-4xl font-display font-extrabold text-accent">
            {Math.round(
              (profile.genre_breakdown.find((g) => g.genre === profile.top_genre)?.percentage || 0)
            )}
            %
          </p>
          <p className="text-muted">Of your listening</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-display font-extrabold text-text mb-6">
          Genre breakdown
        </h2>

        <div className="space-y-4">
          {profile.genre_breakdown.map((item) => (
            <div key={item.genre}>
              <div className="flex justify-between mb-1">
                <span className="text-text capitalize">{item.genre}</span>
                <span className="text-muted">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* FUTURE: plug in recommendation model here — input is taste_profile object */}
        {/* TODO: RECOMMENDATION_MODEL */}
      </Card>
    </div>
  );
}
