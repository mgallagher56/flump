import type { Account } from './types';

export enum AccountTypeEnum {
  CURRENT = 'Current',
  SAVING = 'Saving',
  MORTGAGE = 'Mortgage',
  LOAN = 'Loan',
  CREDIT_CARD = 'Credit Card',
  OWED = 'Owed'
}

export type AccountType = `${AccountTypeEnum}` | string;

export const isAccountTypeValid = (accountType: AccountTypeEnum, accounts: Account[]) =>
  !!accounts?.map(({ type }) => type).some((type) => type === accountType);
