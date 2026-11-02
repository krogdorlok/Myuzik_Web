import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Nav } from "@/components/layout/Nav";
import { nav, router } from "../../mocks";

const api = vi.hoisted(() => ({ logout: vi.fn() }));
vi.mock("next/navigation", async () => (await import("../../mocks")).nextNavigation());
vi.mock("@/lib/api", () => ({ api }));

const user = { id: "u", name: "Ada Lovelace", email: "ada@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Nav", () => {
  it("marks the current section and shows initials", () => {
    nav.pathname = "/history";
    render(<Nav user={user} />);
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Analyze" })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("signs out and returns to sign-in", async () => {
    api.logout.mockResolvedValue(undefined);
    render(<Nav user={user} />);
    await userEvent.click(screen.getByLabelText(/Account menu/));
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(router.replace).toHaveBeenCalledWith("/sign-in");
  });

  it("stays put and says so when sign-out fails", async () => {
    api.logout.mockRejectedValue(new Error("down"));
    render(<Nav user={user} />);
    await userEvent.click(screen.getByLabelText(/Account menu/));
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't sign out");
    expect(router.replace).not.toHaveBeenCalled();
  });
});
