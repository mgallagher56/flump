import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FLPTable, FLPTBody, FLPTd, FLPTHead, FLPTh } from "./FLPTable";

describe("<FLPTable />", () => {
  it("renders table with headers and data cells", () => {
    render(
      <FLPTable>
        <FLPTHead>
          <tr>
            <FLPTh>Account</FLPTh>
            <FLPTh numeric={true}>Balance</FLPTh>
          </tr>
        </FLPTHead>
        <FLPTBody>
          <tr>
            <FLPTd>Barclays Current</FLPTd>
            <FLPTd numeric={true}>£3,420.00</FLPTd>
          </tr>
        </FLPTBody>
      </FLPTable>,
    );

    expect(screen.getByText("Account")).toBeDefined();
    expect(screen.getByText("Balance")).toBeDefined();
    expect(screen.getByText("Barclays Current")).toBeDefined();
    expect(screen.getByText("£3,420.00")).toBeDefined();
  });
});
