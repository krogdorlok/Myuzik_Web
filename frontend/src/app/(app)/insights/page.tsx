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
      <Card className="py-12 text-center">
        <p className="text-muted">Not enough data yet. Upload more music!</p>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="mb-8 font-display text-3xl font-extrabold text-text">Your Taste Profile</h1>

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <Card className="text-center">
          <p className="font-display text-4xl font-extrabold text-accent">
            {profile.total_analyses}
          </p>
          <p className="text-muted">Total analyses</p>
        </Card>

        <Card className="text-center">
          <p className="font-display text-4xl font-extrabold capitalize text-accent">
            {profile.top_genre}
          </p>
          <p className="text-muted">Top genre</p>
        </Card>

        <Card className="text-center">
          <p className="font-display text-4xl font-extrabold text-accent">
            {Math.round(
              profile.genre_breakdown.find((g) => g.genre === profile.top_genre)?.percentage || 0,
            )}
            %
          </p>
          <p className="text-muted">Of your listening</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-6 font-display text-xl font-extrabold text-text">Genre breakdown</h2>

        <div className="space-y-4">
          {profile.genre_breakdown.map((item) => (
            <div key={item.genre}>
              <div className="mb-1 flex justify-between">
                <span className="capitalize text-text">{item.genre}</span>
                <span className="text-muted">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full bg-accent" style={{ width: `${item.percentage}%` }} />
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
