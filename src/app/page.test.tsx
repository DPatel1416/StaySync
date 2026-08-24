import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoginPage from "./page";

describe("StaySync login identity", () => {
  it("uses the dedicated atelier theme instead of a department theme", () => {
    const { container } = render(<LoginPage/>);
    expect(container.querySelector("main")).toHaveAttribute("data-login-theme", "atelier");
    expect(screen.getByLabelText("About StaySync")).toHaveClass("login-stage");
    expect(screen.getAllByTestId("staysync-mark").every((mark) => mark.classList.contains("bg-[#f0715d]"))).toBe(true);
    expect(screen.getAllByRole("heading", { name: /Good stays are choreographed./ }).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Live shift coordination preview")).toBeInTheDocument();
  });
});
