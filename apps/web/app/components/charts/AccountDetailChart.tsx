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
        <XAxis dataKey="Name" height={5} tick={false} />
        <YAxis tick={false} width={1} />
        <Tooltip
          itemStyle={{
            color: '#000'
          }}
          labelStyle={{
            color: '#000',
            fontWeight: 'bold'
          }}
        />
        <Line dataKey="Value" dot={false} stroke="#8884d8" type={curve} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default AccountDetailChart;
