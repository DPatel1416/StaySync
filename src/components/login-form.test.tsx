import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("starts in employee mode without asking for email or property code", () => {
    render(<LoginForm/>);
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
    expect(screen.queryByText(/property code/i)).not.toBeInTheDocument();
  });

  it("switches to account-holder email authentication", () => {
    render(<LoginForm/>);
    fireEvent.click(screen.getByRole("tab", { name: "Account Holder" }));
    expect(screen.getByLabelText("Email address")).toHaveAttribute("type", "email");
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
  });

  it("supports a visible password toggle", () => {
    render(<LoginForm/>);
    const password = screen.getByLabelText("Password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
  });
});
