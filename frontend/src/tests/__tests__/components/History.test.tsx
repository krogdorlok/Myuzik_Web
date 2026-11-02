import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryItem } from "@/components/history/HistoryItem";
import { HistoryList } from "@/components/history/HistoryList";
import { ApiError } from "@/lib/api";
import { historyItem, nav, router } from "../../mocks";

const api = vi.hoisted(() => ({ history: vi.fn(), deletePrediction: vi.fn() }));
vi.mock("next/navigation", async () => (await import("../../mocks")).nextNavigation());
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api }));

beforeEach(() => {
  vi.clearAllMocks();
  nav.pathname = "/history";
  nav.search = new URLSearchParams();
});

describe("HistoryItem", () => {
  it("confirms before deleting and manages focus both ways", async () => {
    const onDelete = vi.fn();
    render(
      <ul>
        <HistoryItem item={historyItem("a")} onDelete={onDelete} />
      </ul>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete a.wav" }));
    expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(screen.getByRole("button", { name: "Delete a.wav" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Delete a.wav" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("a");
  });
});

describe("HistoryList", () => {
  it("renders items, total and pagination", async () => {
    api.history.mockResolvedValue({
      items: [historyItem("a"), historyItem("b", "rock")],
      total: 12,
    });
    render(<HistoryList />);
    expect(await screen.findByText("12 analyses")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(router.replace).toHaveBeenCalledWith("/history?page=1", { scroll: false });
  });

  it("filters by genre through the URL", async () => {
    api.history.mockResolvedValue({ items: [], total: 0 });
    render(<HistoryList />);
    await userEvent.selectOptions(screen.getByLabelText("Genre"), "rock");
    expect(router.replace).toHaveBeenCalledWith("/history?genre=rock", { scroll: false });
  });

  it("shows an empty state for a filter with no matches", async () => {
    nav.search = new URLSearchParams("genre=metal");
    api.history.mockResolvedValue({ items: [], total: 0 });
    render(<HistoryList />);
    expect(await screen.findByText("No Metal yet")).toBeInTheDocument();
    expect(api.history).toHaveBeenCalledWith({ genre: "metal", limit: 10, offset: 0 });
  });

  it("steps back a page when the last item on it is deleted", async () => {
    nav.search = new URLSearchParams("page=1");
    api.history
      .mockResolvedValueOnce({ items: [historyItem("k")], total: 11 })
      .mockResolvedValue({ items: [], total: 10 });
    api.deletePrediction.mockResolvedValue(undefined);
    render(<HistoryList />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete k.wav" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/history", { scroll: false }));
  });

  it("surfaces load errors with a retry", async () => {
    api.history
      .mockRejectedValueOnce(new ApiError(500, "Boom"))
      .mockResolvedValue({ items: [historyItem("a")], total: 1 });
    render(<HistoryList />);
    expect(await screen.findByText("Boom")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("a.wav")).toBeInTheDocument();
  });

  it("drops responses from superseded queries", async () => {
    let resolveFirst: (v: unknown) => void = () => undefined;
    api.history
      .mockReturnValueOnce(new Promise((r) => (resolveFirst = r)))
      .mockResolvedValue({ items: [historyItem("new")], total: 1 });
    const { rerender } = render(<HistoryList />);
    nav.search = new URLSearchParams("genre=jazz");
    rerender(<HistoryList />);
    expect(await screen.findByText("new.wav")).toBeInTheDocument();
    await act(async () => resolveFirst({ items: [historyItem("stale")], total: 1 }));
    expect(screen.queryByText("stale.wav")).not.toBeInTheDocument();
  });

  it("refetches after a failed delete instead of restoring a stale snapshot", async () => {
    api.history.mockResolvedValue({ items: [historyItem("a")], total: 1 });
    api.deletePrediction.mockRejectedValue(new ApiError(404, "Prediction not found"));
    render(<HistoryList />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete a.wav" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Prediction not found")).toBeInTheDocument();
    expect(api.history).toHaveBeenCalledTimes(2);
  });
});
