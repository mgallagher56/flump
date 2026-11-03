import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AddCategoryModal from "./AddCategoryModal";

describe("AddCategoryModal", () => {
  it("renders when open and allows adding a new category", async () => {
    const onAddCategory = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <AddCategoryModal
        open={true}
        onClose={onClose}
        onAddCategory={onAddCategory}
        existingCategories={["housing", "bills"]}
      />,
    );

    expect(screen.getByText("Add Budget Category")).toBeDefined();

    const input = screen.getByTestId("new-category-name-input");
    fireEvent.change(input, { target: { value: "Subscriptions" } });

    const saveBtn = screen.getByTestId("save-new-category-btn");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onAddCategory).toHaveBeenCalledWith("Subscriptions");
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("prevents adding duplicate existing categories", async () => {
    const onAddCategory = vi.fn();
    const onClose = vi.fn();

    render(
      <AddCategoryModal
        open={true}
        onClose={onClose}
        onAddCategory={onAddCategory}
        existingCategories={["housing", "bills", "subscriptions"]}
      />,
    );

    const input = screen.getByTestId("new-category-name-input");
    fireEvent.change(input, { target: { value: "Subscriptions" } });

    const saveBtn = screen.getByTestId("save-new-category-btn");
    fireEvent.click(saveBtn);

    expect(screen.getByText("This category already exists")).toBeDefined();
    expect(onAddCategory).not.toHaveBeenCalled();
  });

  it("selects a suggestion when clicked", () => {
    const onAddCategory = vi.fn();
    const onClose = vi.fn();

    render(
      <AddCategoryModal
        open={true}
        onClose={onClose}
        onAddCategory={onAddCategory}
        existingCategories={["housing"]}
      />,
    );

    const suggestionBtn = screen.getByText("Pets");
    fireEvent.click(suggestionBtn);

    const input = screen.getByTestId("new-category-name-input") as HTMLInputElement;
    expect(input.value).toBe("Pets");
  });
});
