import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "@/components/ui/Input";

describe("Input", () => {
  it("labels the field and links hint and error for assistive tech", () => {
    render(<Input label="Password" hint="At least 8 characters" error="Too short" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAccessibleDescription("At least 8 characters Too short");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("has no description or invalid state by default", () => {
    render(<Input label="Email" />);
    const input = screen.getByLabelText("Email");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");
  });
});
