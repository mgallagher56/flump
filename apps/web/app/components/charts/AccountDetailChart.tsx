import { type ComponentProps, type FC, useMemo } from 'react';

import { curveCardinal } from 'd3-shape';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AccountDetail } from '~/containers/accounts/types';

interface AccountDetailChartProps extends ComponentProps<typeof LineChart> {
  accountDetails: AccountDetail[];
}

const curve = curveCardinal.tension(0.1);

const AccountDetailChart: FC<AccountDetailChartProps> = ({ accountDetails }) => {
  const formattedAccountDetails = useMemo(
    () =>
      accountDetails.map((accountDetail) => ({
        Name: `${accountDetail.month}/${accountDetail.year.toString().slice(-2)}`,
        Value: accountDetail.value
      })),
    [accountDetails]
  );

  return (
    <ResponsiveContainer height="95%" width="100%">
      <LineChart
        data={formattedAccountDetails}
        margin={{
          top: 5,
          right: 0,
          left: 0,
          bottom: 5
        }}
      >
        <XAxis height={5} tick={false} dataKey="Name" />
        <YAxis width={1} tick={false} />
        <Tooltip
          labelStyle={{
            color: '#000',
            fontWeight: 'bold'
          }}
          itemStyle={{
            color: '#000'
          }}
        />
        <Line type={curve} dot={false} dataKey="Value" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default AccountDetailChart;
