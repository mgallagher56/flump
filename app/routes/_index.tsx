import { Box, Button, ButtonGroup } from '@chakra-ui/react';
import type { V2_MetaFunction } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { useOptionalUser } from '~/utils';

export const meta: V2_MetaFunction = () => [{ title: 'Remix Notes' }];

export default function Index() {
  const user = useOptionalUser();
  return (
    <main>
      <Box>
        {user ? (
          <Button colorScheme={'blue'} as={Link} to={'/notes'}>
            View Notes for {user.email}
          </Button>
        ) : (
          <ButtonGroup>
            <Button colorScheme="blue" as={Link} to="/join">
              Sign up
            </Button>
            <Button colorScheme="blue" as={Link} to="/login">
              Log in
            </Button>
          </ButtonGroup>
        )}
      </Box>
    </main>
  );
}
