import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PropertyOnboardingPage from "./page";

describe("Property onboarding", () => {
  it("collects property details after account creation", () => {
    render(<PropertyOnboardingPage/>);
    expect(screen.getByRole("heading", { name: "Let’s set up your hotel." })).toBeInTheDocument();
    expect(screen.getByLabelText("Organization name")).toBeInTheDocument();
    expect(screen.getByLabelText("Property name")).toBeInTheDocument();
    expect(screen.getByLabelText("Number of guest rooms")).toBeInTheDocument();
    expect(screen.getByLabelText("City")).toBeInTheDocument();
    expect(screen.getByLabelText("Province or state")).toBeInTheDocument();
    expect(screen.getByLabelText("Country")).toBeInTheDocument();
  });
});
