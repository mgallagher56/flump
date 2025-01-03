import customRender from '~/testUtils/customRender';

import { vi } from 'vitest';

import SignOut from './SignOut';

const mocks = vi.hoisted(() => ({
  signOut: vi.fn()
}));

vi.mock('app/utils/supabase', () => ({
  default: {
    auth: {
      signOut: mocks.signOut
    }
  }
}));

describe('<SignOut />', () => {
  test('should call signOut when clicking the button', () => {
    const { getByText } =customRender(<SignOut />);
    const logoutButton = getByText('logOut') as HTMLButtonElement;
    logoutButton.click();
    expect(mocks.signOut).toHaveBeenCalled();
  });
});
