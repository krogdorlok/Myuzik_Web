import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { LiveStats } from "@/components/live/LiveStats";
import { LiveTimeline } from "@/components/live/LiveTimeline";
import { SourcePicker } from "@/components/live/SourcePicker";

vi.stubGlobal("matchMedia", () => ({ matches: false }));
Element.prototype.scrollTo = vi.fn() as unknown as Element["scrollTo"];

describe("LiveTimeline", () => {
  const segments = [
    { genre: "jazz", confidence: 0.8, startS: 0, endS: 12 },
    { genre: "hiphop", confidence: 0.6, startS: 12, endS: 75 },
  ];

  it("reads like a transcript", () => {
    render(<LiveTimeline segments={segments} />);
    expect(screen.getByText("0:12–1:15")).toBeInTheDocument();
    expect(screen.getByText("Hip-hop")).toBeInTheDocument();
  });

  it("offers Jump to live after the listener scrolls up", async () => {
    render(<LiveTimeline segments={segments} />);
    const list = screen.getByRole("list", { name: "Genre timeline" });
    Object.defineProperties(list, {
      scrollHeight: { value: 1000 },
      clientHeight: { value: 200 },
      scrollTop: { value: 100, writable: true },
    });
    fireEvent.scroll(list);
    await userEvent.click(screen.getByRole("button", { name: "Jump to live" }));
    expect(screen.queryByRole("button", { name: "Jump to live" })).not.toBeInTheDocument();
    expect(list.scrollTo).toHaveBeenCalled();
  });
});

describe("LiveStats", () => {
  it("summarises latency percentiles and counters", () => {
    const stats = {
      latenciesMs: [10, 20, 30, 40],
      framesSent: 4,
      framesDropped: 1,
      bytesSent: 4 * 30728,
      reconnects: 2,
      recoveryMs: [400, 500],
      startedAt: 0,
    };
    render(<LiveStats stats={stats} />);
    const dl = screen.getByTestId("live-stats");
    expect(dl).toHaveAttribute("data-p50", "20");
    expect(dl).toHaveAttribute("data-p95", "40");
    expect(dl).toHaveAttribute("data-recovery", "400,500");
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders placeholders before any data", () => {
    render(<LiveStats stats={null} />);
    expect(screen.getAllByText("—")).toHaveLength(3);
  });
});

describe("SourcePicker", () => {
  it("switches modes and validates the chosen track", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SourcePicker
        source={{ mode: "mic" }}
        onChange={onChange}
        disabled={false}
        audioRef={createRef()}
        take={0}
      />,
    );
    await userEvent.click(screen.getByLabelText("Play a file"));
    expect(onChange).toHaveBeenCalledWith({ mode: "file", file: undefined });
    rerender(
      <SourcePicker
        source={{ mode: "file" }}
        onChange={onChange}
        disabled={false}
        audioRef={createRef()}
        take={0}
      />,
    );
    await userEvent.upload(
      screen.getByLabelText("Track"),
      new File(["nope"], "x.wav", { type: "audio/wav" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/doesn't look like/);
  });

  it("renders a player for the chosen file and revokes its URL on change", () => {
    const revoke = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { revokeObjectURL: revoke }));
    const props = {
      onChange: () => undefined,
      disabled: false,
      audioRef: createRef<HTMLAudioElement>(),
      take: 0,
    };
    const { rerender } = render(
      <SourcePicker {...props} source={{ mode: "file", file: { url: "blob:a", name: "a.wav" } }} />,
    );
    expect(screen.getByLabelText("a.wav")).toBeInTheDocument();
    rerender(<SourcePicker {...props} source={{ mode: "mic" }} />);
    expect(revoke).toHaveBeenCalledWith("blob:a");
  });
});
