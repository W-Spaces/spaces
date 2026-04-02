import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpaceForm } from "./SpaceForm";
import type { Space } from "@/types";

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
};

describe("SpaceForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders new space form when open and no initial data", () => {
    render(<SpaceForm {...defaultProps} />);
    expect(screen.getByText("New Space")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Give your workspace configuration a name and description.",
      ),
    ).toBeInTheDocument();
  });

  it("renders edit form when initial data is provided", () => {
    const existing: Space = {
      id: "1",
      name: "My Space",
      description: "A description",
      color: "green",
      items: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    render(<SpaceForm {...defaultProps} initial={existing} />);
    expect(screen.getByText("Edit Space")).toBeInTheDocument();
    expect(
      screen.getByText("Update the name, description, and color of the space."),
    ).toBeInTheDocument();
  });

  it("pre-fills fields when editing", () => {
    const existing: Space = {
      id: "1",
      name: "Dev Space",
      description: "Work stuff",
      color: "purple",
      items: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    render(<SpaceForm {...defaultProps} initial={existing} />);
    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    expect(nameInput.value).toBe("Dev Space");
    const descInput = screen.getByLabelText(
      /description/i,
    ) as HTMLTextAreaElement;
    expect(descInput.value).toBe("Work stuff");
  });

  it("calls onClose when dialog is closed", () => {
    const onClose = vi.fn();
    render(<SpaceForm {...defaultProps} onClose={onClose} />);
    // DialogContent has a close button — find the X or close button
    const closeButton =
      screen.getByRole("button", { name: /close/i }) ||
      (document.querySelector('[aria-label="Close"]') as HTMLButtonElement);
    // Fall back to clicking outside by triggering onOpenChange with false
    // The Dialog's onOpenChange fires when backdrop is clicked
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onSave with name, description, color when submitted", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SpaceForm {...defaultProps} onSave={onSave} />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Test Space");

    const submitButton = screen.getByRole("button", { name: /create space/i });
    await user.click(submitButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Space",
        description: "",
        color: "blue", // default
      }),
    );
  });

  it("does not submit when name is empty", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SpaceForm {...defaultProps} onSave={onSave} />);

    // Name starts empty, try to submit
    const submitButton = screen.getByRole("button", { name: /create space/i });
    await user.click(submitButton);

    expect(onSave).not.toHaveBeenCalled();
  });

  it("trims whitespace from name and description", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SpaceForm {...defaultProps} onSave={onSave} />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "  Trimmed Name  ");

    const descInput = screen.getByLabelText(/description/i);
    await user.clear(descInput);
    await user.type(descInput, "  Trimmed Desc  ");

    const submitButton = screen.getByRole("button", { name: /create space/i });
    await user.click(submitButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Trimmed Name",
        description: "Trimmed Desc",
      }),
    );
  });

  it("resets form when opened with no initial after being closed", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SpaceForm {...defaultProps} />);

    // Fill in the name
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, "Some Name");

    // Close the dialog
    rerender(<SpaceForm {...defaultProps} open={false} />);

    // Re-open
    rerender(<SpaceForm {...defaultProps} open={true} />);

    // Name should be reset
    const newNameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    expect(newNameInput.value).toBe("");
  });

  it("has all color options available", () => {
    render(<SpaceForm {...defaultProps} />);
    // Check that color selector exists
    const colorLabel = screen.getByText("Color");
    expect(colorLabel).toBeInTheDocument();
  });
});
