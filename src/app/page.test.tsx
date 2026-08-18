import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoginPage from "./page";

describe("StaySync login identity", () => {
  it("uses the dedicated ocean theme instead of a department theme", () => {
    const { container } = render(<LoginPage/>);
    expect(container.querySelector("main")).toHaveAttribute("data-login-theme", "ocean");
    expect(screen.getByLabelText("About StaySync")).toHaveClass("from-slate-950", "via-sky-950", "to-blue-700");
    expect(screen.getByTestId("staysync-mark")).toHaveClass("bg-[#0284c7]");
  });
});
