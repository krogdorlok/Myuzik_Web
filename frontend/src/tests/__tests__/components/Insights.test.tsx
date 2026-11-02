import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TasteProfile } from "@/components/insights/TasteProfile";
import { ApiError } from "@/lib/api";

const api = vi.hoisted(() => ({ tasteProfile: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TasteProfile", () => {
  it("shows headline stats and an accessible donut", async () => {
    api.tasteProfile.mockResolvedValue({
      total_analyses: 4,
      top_genre: "jazz",
      genre_breakdown: [
        { genre: "jazz", count: 3, percentage: 75 },
        { genre: "rock", count: 1, percentage: 25 },
      ],
    });
    render(<TasteProfile />);
    expect(await screen.findByText("Your sound")).toBeInTheDocument();
    expect(screen.getByText("of it is Jazz")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Genre share across 4 analyses" })).toBeInTheDocument();
  });

  it("has an empty state", async () => {
    api.tasteProfile.mockResolvedValue({ total_analyses: 0, top_genre: null, genre_breakdown: [] });
    render(<TasteProfile />);
    expect(await screen.findByText("No listening data yet")).toBeInTheDocument();
  });

  it("has an error state", async () => {
    api.tasteProfile.mockRejectedValue(new ApiError(503, "Service unavailable"));
    render(<TasteProfile />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
  });

  it("shows skeletons while loading", () => {
    api.tasteProfile.mockReturnValue(new Promise(() => undefined));
    render(<TasteProfile />);
    expect(screen.getByLabelText("Loading insights")).toHaveAttribute("aria-busy", "true");
  });
});
