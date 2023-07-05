import supabase from '~/utils/supabase';

import FLPButton from '../core/buttons/FLPButton';
import FLPButtonGroup from '../core/buttons/FLPButtonGroup';

const Login = () => {
  const handleEmailLogin = async () => {
   const {data, error} = await supabase.auth.signInWithPassword({
      email: 'mgrdevuk@gmail.com',
      password: 'password'
    });
    console.log({data, error});
  };

  const handleGitHubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback'
      }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <FLPButtonGroup orientation='vertical'>
      <FLPButton onClick={handleEmailLogin}>Email Login</FLPButton>
      <FLPButton onClick={handleGitHubLogin}>GitHub Login</FLPButton>
      <FLPButton onClick={handleLogout}>Logout</FLPButton>
    </FLPButtonGroup>
  );
};

export default Login;
