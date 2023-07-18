import type { Account } from './types';

export enum AccountTypeEnum {
  CURRENT = 'Current',
  SAVING = 'Saving',
  MORTGAGE = 'Mortgage',
  LOAN = 'Loan',
  OWED = 'Owed'
}

export const isAccountTypeValid = (accountType: AccountTypeEnum, accounts: Account[]) =>
  !!accounts?.map(({ type }) => type).some((type) => type === accountType);
