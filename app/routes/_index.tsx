import type { V2_MetaFunction } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { FLPButtonGroup } from '~/components/core/buttons/FLPButtonGroup';
import { FLPLinkButton } from '~/components/core/buttons/FLPLinkButton';
import { FLPBox } from '~/components/core/structure/FLPBox';
import { useOptionalUser } from '~/utils/utils';

import supabase from '../utils/supabase';

export const meta: V2_MetaFunction = () => [{ title: 'Remix Notes' }];

export default function Index() {
  const user = useOptionalUser();
  const { posts } = useLoaderData();

  return (
    <main>
      <FLPBox>
        {user ? (
          <FLPLinkButton colorScheme={'blue'} as={Link} to={'/notes'}>
            View Notes for {user.email}
          </FLPLinkButton>
        ) : (
          <FLPButtonGroup>
            <FLPLinkButton colorScheme="blue" as={Link} to="/join">
              Sign up
            </FLPLinkButton>
            <FLPLinkButton colorScheme="blue" as={Link} to="/login">
              Log in
            </FLPLinkButton>
          </FLPButtonGroup>
        )}
        {posts.map((post) => (
          <FLPBox key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.content}</p>
          </FLPBox>
        ))}
      </FLPBox>
    </main>
  );
}

export const loader = async () => {
  const { data: posts } = await supabase.from('posts').select('*');
  return { posts };
};
