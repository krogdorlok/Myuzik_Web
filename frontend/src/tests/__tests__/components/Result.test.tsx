import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResultCard } from "@/components/result/ResultCard";
import { GenreBar } from "@/components/result/GenreBar";
import { sampleResult } from "../../mocks";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test double for next/image
  default: (p: { alt: string; src: string }) => <img alt={p.alt} src={p.src} />,
}));

describe("ResultCard", () => {
  it("leads with the top genre and lists every score, highest first", () => {
    render(<ResultCard result={sampleResult} filename="so-what.wav" onReset={() => undefined} />);
    expect(screen.getByRole("heading", { name: "Jazz" })).toBeInTheDocument();
    expect(screen.getByText("72% confident")).toBeInTheDocument();
    const bars = screen.getAllByRole("progressbar");
    expect(bars.map((b) => b.getAttribute("aria-valuenow"))).toEqual(["72", "18", "10"]);
  });

  it("shows the Spotify match and album art when there is one", () => {
    const match = {
      track_name: "So What",
      artist: "Miles Davis",
      album: "Kind of Blue",
      album_art_url: "https://i.scdn.co/a",
    };
    render(
      <ResultCard
        result={{ ...sampleResult, spotify_match: match }}
        filename="x.wav"
        onReset={() => undefined}
      />,
    );
    expect(screen.getByAltText("Kind of Blue cover")).toBeInTheDocument();
    expect(screen.getByText("So What")).toBeInTheDocument();
  });

  it("offers to analyse another track", async () => {
    const onReset = vi.fn();
    render(<ResultCard result={sampleResult} filename="x.wav" onReset={onReset} />);
    await userEvent.click(screen.getByRole("button", { name: "Analyse another track" }));
    expect(onReset).toHaveBeenCalled();
  });
});

describe("GenreBar", () => {
  it("staggers static bars and glides live ones", () => {
    const { rerender, container } = render(
      <ol>
        <GenreBar genre="hiphop" score={0.5} index={2} />
      </ol>,
    );
    const fill = () => container.querySelector("[role=progressbar] > div") as HTMLElement;
    expect(screen.getByText("Hip-hop")).toBeInTheDocument();
    expect(fill().style.animationDelay).toBe("100ms");
    rerender(
      <ol>
        <GenreBar genre="hiphop" score={0.5} index={2} live />
      </ol>,
    );
    expect(fill().className).toContain("transition-[width]");
  });
});
