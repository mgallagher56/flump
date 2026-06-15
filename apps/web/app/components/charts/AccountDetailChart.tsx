import { curveCardinal } from "d3-shape";
import { type FC, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AccountDetail } from "~/containers/accounts/types";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

interface AccountDetailChartProps {
  accountDetails: AccountDetail[];
  showAxes?: boolean;
}

const curve = curveCardinal.tension(0.1);

const AccountDetailChart: FC<AccountDetailChartProps> = ({ accountDetails, showAxes = false }) => {
  const { formatCurrency } = useFormatCurrency();
  const formattedAccountDetails = useMemo(
    () =>
      accountDetails.map((accountDetail) => ({
        Name: `${accountDetail.month}/${accountDetail.year.toString().slice(-2)}`,
        Value: accountDetail.value,
      })),
    [accountDetails],
  );

  return (
    <ResponsiveContainer height="100%" width="100%">
      <AreaChart
        data={formattedAccountDetails}
        margin={
          showAxes
            ? { top: 10, right: 10, left: -10, bottom: 5 }
            : { top: 0, right: 0, left: 0, bottom: 0 }
        }
      >
        <defs>
          <linearGradient id="colorValue" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#6363F1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6363F1" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        {showAxes && (
          <CartesianGrid strokeDasharray="3 3" stroke="var(--colors-border)" vertical={false} />
        )}
        {showAxes ? (
          <XAxis
            axisLine={false}
            dataKey="Name"
            fontSize={11}
            stroke="var(--colors-text-muted)"
            tickLine={false}
            tickMargin={8}
          />
        ) : (
          <XAxis dataKey="Name" height={0} tick={false} />
        )}
        {showAxes ? (
          <YAxis
            axisLine={false}
            fontSize={11}
            stroke="var(--colors-text-muted)"
            tickFormatter={(value: any) => formatCurrency(value)}
            tickLine={false}
            tickMargin={8}
          />
        ) : (
          <YAxis tick={false} width={0} />
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--colors-card)",
            borderColor: "var(--colors-border)",
            borderRadius: "8px",
          }}
          formatter={(value: any) => [formatCurrency(value), "Balance"]}
          itemStyle={{
            color: "var(--colors-text-primary)",
          }}
          labelStyle={{
            color: "var(--colors-text-muted)",
            fontWeight: "bold",
          }}
        />
        <Area
          dataKey="Value"
          dot={false}
          fill="url(#colorValue)"
          stroke="#6363F1"
          strokeWidth={1.5}
          type={curve}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default AccountDetailChart;
