import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "@/components/auth/AuthForm";
import { ApiError } from "@/lib/api";
import { nav, router } from "../../mocks";

const api = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn() }));
vi.mock("next/navigation", async () => (await import("../../mocks")).nextNavigation());
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api }));

beforeEach(() => {
  vi.clearAllMocks();
  nav.search = new URLSearchParams();
});

describe("AuthForm", () => {
  it("signs in and follows a same-origin ?next=", async () => {
    nav.search = new URLSearchParams("next=/history?genre=jazz");
    api.login.mockResolvedValue({ user: {} });
    render(<AuthForm mode="sign-in" />);
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(api.login).toHaveBeenCalledWith("ada@example.com", "secret");
    expect(router.replace).toHaveBeenCalledWith("/history?genre=jazz");
  });

  it.each(["//evil.example", "/\\evil.example", "https://evil.example/x"])(
    "ignores off-site next=%s",
    async (next) => {
      nav.search = new URLSearchParams({ next });
      api.login.mockResolvedValue({ user: {} });
      render(<AuthForm mode="sign-in" />);
      await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
      await userEvent.type(screen.getByLabelText("Password"), "secret");
      await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
      expect(router.replace).toHaveBeenCalledWith("/");
    },
  );

  it("shows server errors and re-enables the form", async () => {
    api.login.mockRejectedValue(new ApiError(401, "Invalid email or password"));
    render(<AuthForm mode="sign-in" />);
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("catches mismatched passwords before calling the API", async () => {
    render(<AuthForm mode="sign-up" />);
    await userEvent.type(screen.getByLabelText("Name"), "Ada");
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.type(screen.getByLabelText("Confirm password"), "password124");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("registers new accounts", async () => {
    api.register.mockResolvedValue({ user: {} });
    render(<AuthForm mode="sign-up" />);
    await userEvent.type(screen.getByLabelText("Name"), "Ada");
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.type(screen.getByLabelText("Confirm password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(api.register).toHaveBeenCalledWith("Ada", "ada@example.com", "password123");
  });

  it("reports network failures", async () => {
    api.login.mockRejectedValue(new TypeError("fetch failed"));
    render(<AuthForm mode="sign-in" />);
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText(/Network error/)).toBeInTheDocument();
  });
});
