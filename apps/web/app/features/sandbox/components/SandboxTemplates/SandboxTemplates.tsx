import {
  AllowanceProgressPill,
  Button,
  Card,
  CollapsibleDrawer,
  DebtToWealthChart,
  KpiCard,
  KpiStrip,
  PageHeader,
  SimulatorSplitLayout,
  Table,
  TaxTrapEscapeBanner,
  TBody,
  Td,
  THead,
  Th,
} from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import { PayoffStrategyControls } from "../../../debt/components/PayoffStrategyControls";
import { sandboxLayoutRecipe } from "./SandboxTemplates.styles";

export interface SandboxTemplatesProps {
  stage?: 1 | 2 | 3;
}

export const Stage1View: FC = () => {
  const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");
  const [extraPayment, setExtraPayment] = useState(200);

  return (
    <div className={sandboxLayoutRecipe({ stage: 1 })}>
      <PageHeader
        subtitle="Prioritise high-APR clearing and model the crossover bridge into ISAs."
        title="Stage 1: Stabilise & Clear"
      />
      <div style={{ marginBottom: "24px" }}>
        <KpiStrip columns={4}>
          <KpiCard deltaText="High APR" deltaVariant="danger" label="Total Debt" value="£8,150" />
          <KpiCard
            deltaText="Mandatory"
            deltaVariant="neutral"
            label="Minimum Payments"
            value="£315/mo"
          />
          <KpiCard
            deltaText="18 Months"
            deltaVariant="positive"
            label="Debt-Free Point"
            value="Year 1.5"
          />
          <KpiCard
            deltaText="Optimised"
            deltaVariant="brand"
            label="Interest Saved"
            value="£2,140"
          />
        </KpiStrip>
      </div>
      <SimulatorSplitLayout
        controls={
          <PayoffStrategyControls
            extraPayment={extraPayment}
            onChangeExtraPayment={setExtraPayment}
            onSelectStrategy={setStrategy}
            selectedStrategy={strategy}
          />
        }
        content={
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <DebtToWealthChart
              debtFreeYear={1.5}
              monthlyOutflow={515}
              wealthAccumulatedFiveYrs={34500}
            />
            <CollapsibleDrawer
              defaultOpen={false}
              badge="18 Months"
              title="Full Amortisation & Repayment Schedule"
            >
              <Table>
                <THead>
                  <tr>
                    <Th>Month</Th>
                    <Th numeric>Total Paid</Th>
                    <Th numeric>Interest</Th>
                    <Th numeric>Remaining Balance</Th>
                  </tr>
                </THead>
                <TBody>
                  <tr>
                    <Td>Month 1</Td>
                    <Td numeric>£515</Td>
                    <Td numeric>£112</Td>
                    <Td numeric>£7,747</Td>
                  </tr>
                  <tr>
                    <Td>Month 2</Td>
                    <Td numeric>£515</Td>
                    <Td numeric>£106</Td>
                    <Td numeric>£7,338</Td>
                  </tr>
                  <tr>
                    <Td>Month 3</Td>
                    <Td numeric>£515</Td>
                    <Td numeric>£100</Td>
                    <Td numeric>£6,923</Td>
                  </tr>
                  <tr>
                    <Td>Month 6</Td>
                    <Td numeric>£515</Td>
                    <Td numeric>£82</Td>
                    <Td numeric>£5,640</Td>
                  </tr>
                  <tr>
                    <Td>Month 12</Td>
                    <Td numeric>£515</Td>
                    <Td numeric>£41</Td>
                    <Td numeric>£2,930</Td>
                  </tr>
                  <tr>
                    <Td>Month 18</Td>
                    <Td numeric>£515</Td>
                    <Td numeric>£0</Td>
                    <Td numeric>£0</Td>
                  </tr>
                </TBody>
              </Table>
            </CollapsibleDrawer>
          </div>
        }
      />
    </div>
  );
};

export const Stage2View: FC = () => (
  <div className={sandboxLayoutRecipe({ stage: 2 })}>
    <PageHeader
      subtitle="Redirect liability repayments directly into compound wealth vehicles."
      title="Stage 2: Crossover & Accumulate"
    />
    <div style={{ marginBottom: "24px" }}>
      <KpiStrip columns={4}>
        <KpiCard
          deltaText="Zero Liabilities"
          deltaVariant="positive"
          label="Total Debt"
          value="£0"
        />
        <KpiCard
          deltaText="Compounding"
          deltaVariant="brand"
          label="Stocks & Shares ISA"
          value="£24,500"
        />
        <KpiCard
          deltaText="Re-allocated"
          deltaVariant="positive"
          label="Monthly ISA Inflow"
          value="£515/mo"
        />
        <KpiCard
          deltaText="7% Projected Return"
          deltaVariant="positive"
          label="10-Year Value"
          value="£91,400"
        />
      </KpiStrip>
    </div>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "24px",
      }}
    >
      <AllowanceProgressPill currentAmount={6180} type="isa" />
      <Card elevation="resting">
        <h3
          className={css({
            fontFamily: "display",
            fontSize: "md",
            fontWeight: "bold",
            color: "text.primary",
            margin: "0 0 8px 0",
          })}
        >
          Crossover Milestone Reached
        </h3>
        <p
          className={css({
            fontSize: "sm",
            color: "text.secondary",
            margin: "0 0 16px 0",
          })}
        >
          You are redirecting £515/month that used to service high-APR debt into a tax-free ISA
          portfolio.
        </p>
        <Button size="sm" variant="primary">
          Explore ISA Scenarios
        </Button>
      </Card>
    </div>
  </div>
);

export const Stage3View: FC = () => (
  <div className={sandboxLayoutRecipe({ stage: 3 })}>
    <PageHeader
      subtitle="Mitigate personal allowance taper and optimise lifetime wealth retention."
      title="Stage 3: Tax Trap Escape & Wealth Acceleration"
    />
    <div style={{ marginBottom: "24px" }}>
      <TaxTrapEscapeBanner grossIncome={112000} />
    </div>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "24px",
      }}
    >
      <AllowanceProgressPill currentAmount={12000} type="pension" />
      <AllowanceProgressPill currentAmount={15400} type="isa" />
    </div>
  </div>
);

const sampleLabelStyle = css({
  fontSize: "xs",
  fontWeight: "semibold",
  color: "text.muted",
  marginBottom: "8px",
});

export const SandboxTemplates: FC<SandboxTemplatesProps> = ({ stage = 1 }) => {
  const view = stage === 2 ? <Stage2View /> : stage === 3 ? <Stage3View /> : <Stage1View />;
  return (
    <>
      <p className={sampleLabelStyle} id="sample-data-label">
        Sample data: illustrative figures, not yours.
      </p>
      {view}
    </>
  );
};

export default SandboxTemplates;
