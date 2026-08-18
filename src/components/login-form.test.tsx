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
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("provides a new account-holder registration form", () => {
    render(<LoginForm/>);
    fireEvent.click(screen.getByRole("tab", { name: "Account Holder" }));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("heading", { name: "Create your hotel account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Organization name")).toBeInTheDocument();
    expect(screen.getByLabelText("First property")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });

  it("supports a visible password toggle", () => {
    render(<LoginForm/>);
    const password = screen.getByLabelText("Password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
  });
});
