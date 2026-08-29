import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoginPage from "./page";

describe("StaySync login identity", () => {
  it("uses the dedicated signal theme instead of a department theme", () => {
    const { container } = render(<LoginPage/>);
    expect(container.querySelector("main")).toHaveAttribute("data-login-theme", "signal");
    expect(screen.getByLabelText("About StaySync")).toHaveClass("login-stage");
    expect(screen.getAllByTestId("staysync-mark").every((mark) => mark.classList.contains("bg-[#caff4d]"))).toBe(true);
    expect(screen.getAllByRole("heading", { name: /Move as one./ }).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("A modern hotel access key floating in motion")).toBeInTheDocument();
  });

  it("changes the brand story for General Managers", () => {
    render(<LoginPage/>);
    fireEvent.click(screen.getByRole("tab", { name: "General Manager" }));
    expect(screen.getAllByRole("heading", { name: /See the whole./ }).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("A collection of hotel access keys moving into alignment")).toBeInTheDocument();
  });
});
