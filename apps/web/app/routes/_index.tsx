import { Badge, Box, Flex, Grid, Stack } from "@chakra-ui/react";
import type { Database } from "db_types";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { FiDatabase, FiLock, FiPieChart, FiTrendingUp } from "react-icons/fi";
import { data, type MetaFunction, Link as RouterLink, useLoaderData } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPBox from "~/components/core/structure/FLPBox";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { createSupaBaseServerClient } from "~/utils/supabase";

export const meta: MetaFunction = (): { title: string }[] => [
  { title: "Flump | Smart Personal Finance & Asset Tracker" },
];

export const handle = {
  i18n: ["common", "home"],
};

export type Employee = Database["public"]["Tables"]["employees"]["Row"];

export const loader = async ({ request }: { request: Request }) => {
  const responseHeaders = new Headers();
  const supabase = createSupaBaseServerClient(request, responseHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return data({ user }, { headers: responseHeaders });
};

const Index = (): ReactElement => {
  const { t } = useTranslation();
  const { user } = useLoaderData<typeof loader>();

  return (
    <FLPBox as="main" paddingY={{ base: 8, md: 16 }}>
      {/* Hero Section */}
      <Flex
        alignItems="center"
        direction="column"
        gap={6}
        justifyContent="center"
        marginX="auto"
        maxW="3xl"
        mb={20}
        paddingX={4}
        textAlign="center"
      >
        <Badge borderRadius="full" colorPalette="blue" px={3} py={1} size="lg" variant="subtle">
          ✨ Introducing Flump 1.22
        </Badge>
        <FLPHeading as="h1" color="blue.500" lineHeight="tight" size="3xl">
          Your entire financial universe, simplified.
        </FLPHeading>
        <FLPText color={{ base: "gray.600", _dark: "gray.300" }} fontSize="lg" maxW="2xl">
          Aggregate your current accounts, savings, credit cards, mortgages, and loans in one
          unified dashboard. Track monthly changes, visualize trends, and reach your goals.
        </FLPText>
        <Stack direction={{ base: "column", sm: "row" }} gap={4} mt={4}>
          {user ? (
            <FLPButton asChild colorPalette="blue" size="lg">
              <RouterLink to="/app/accounts">{t("dashboard")}</RouterLink>
            </FLPButton>
          ) : (
            <>
              <FLPButton asChild colorPalette="blue" size="lg">
                <RouterLink to="/signup">{t("signUp")}</RouterLink>
              </FLPButton>
              <FLPButton asChild colorPalette="gray" size="lg" variant="outline">
                <RouterLink to="/login">{t("logIn")}</RouterLink>
              </FLPButton>
            </>
          )}
        </Stack>
      </Flex>

      {/* Feature Grid */}
      <FLPBox mb={20} paddingX={4}>
        <Flex direction="column" gap={2} mb={12} textAlign="center">
          <FLPHeading as="h2" color="blue.500" size="xl">
            Everything you need to master your money
          </FLPHeading>
          <FLPText color="gray.500" fontSize="md">
            Features built to give you total clarity and control over your net worth.
          </FLPText>
        </Flex>

        <Grid gap={8} templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }}>
          {/* Card 1 */}
          <Box
            _hover={{
              transform: "translateY(-5px)",
              boxShadow: "md",
              borderColor: { base: "blue.400", _dark: "blue.600" },
            }}
            bg={{ base: "white", _dark: "gray.900" }}
            border="1px solid"
            borderColor={{ base: "gray.200", _dark: "gray.800" }}
            borderRadius="xl"
            boxShadow="sm"
            padding={6}
            transition="all 0.3s ease"
          >
            <Flex
              alignItems="center"
              bg="blue.50"
              borderRadius="lg"
              boxSize={12}
              color="blue.500"
              fontSize="2xl"
              justifyContent="center"
              mb={4}
            >
              <FiDatabase />
            </Flex>
            <FLPHeading as="h3" color="blue.500" mb={2} size="md">
              Wealth Aggregation
            </FLPHeading>
            <FLPText color={{ base: "gray.600", _dark: "gray.400" }} fontSize="sm">
              Current accounts, savings, debts, and investments. View all of your assets and
              liabilities in one place.
            </FLPText>
          </Box>

          {/* Card 2 */}
          <Box
            _hover={{
              transform: "translateY(-5px)",
              boxShadow: "md",
              borderColor: { base: "blue.400", _dark: "blue.600" },
            }}
            bg={{ base: "white", _dark: "gray.900" }}
            border="1px solid"
            borderColor={{ base: "gray.200", _dark: "gray.800" }}
            borderRadius="xl"
            boxShadow="sm"
            padding={6}
            transition="all 0.3s ease"
          >
            <Flex
              alignItems="center"
              bg="green.50"
              borderRadius="lg"
              boxSize={12}
              color="green.500"
              fontSize="2xl"
              justifyContent="center"
              mb={4}
            >
              <FiTrendingUp />
            </Flex>
            <FLPHeading as="h3" color="green.500" mb={2} size="md">
              Interactive Analytics
            </FLPHeading>
            <FLPText color={{ base: "gray.600", _dark: "gray.400" }} fontSize="sm">
              Beautiful historical data charts showing month-over-month progress and account balance
              changes over time.
            </FLPText>
          </Box>

          {/* Card 3 */}
          <Box
            _hover={{
              transform: "translateY(-5px)",
              boxShadow: "md",
              borderColor: { base: "blue.400", _dark: "blue.600" },
            }}
            bg={{ base: "white", _dark: "gray.900" }}
            border="1px solid"
            borderColor={{ base: "gray.200", _dark: "gray.800" }}
            borderRadius="xl"
            boxShadow="sm"
            padding={6}
            transition="all 0.3s ease"
          >
            <Flex
              alignItems="center"
              bg="purple.50"
              borderRadius="lg"
              boxSize={12}
              color="purple.500"
              fontSize="2xl"
              justifyContent="center"
              mb={4}
            >
              <FiPieChart />
            </Flex>
            <FLPHeading as="h3" color="purple.500" mb={2} size="md">
              Net Worth Tracking
            </FLPHeading>
            <FLPText color={{ base: "gray.600", _dark: "gray.400" }} fontSize="sm">
              Calculate your overall net worth automatically by subtracting your loans and mortgages
              from your cash assets.
            </FLPText>
          </Box>

          {/* Card 4 */}
          <Box
            _hover={{
              transform: "translateY(-5px)",
              boxShadow: "md",
              borderColor: { base: "blue.400", _dark: "blue.600" },
            }}
            bg={{ base: "white", _dark: "gray.900" }}
            border="1px solid"
            borderColor={{ base: "gray.200", _dark: "gray.800" }}
            borderRadius="xl"
            boxShadow="sm"
            padding={6}
            transition="all 0.3s ease"
          >
            <Flex
              alignItems="center"
              bg="red.50"
              borderRadius="lg"
              boxSize={12}
              color="red.500"
              fontSize="2xl"
              justifyContent="center"
              mb={4}
            >
              <FiLock />
            </Flex>
            <FLPHeading as="h3" color="red.500" mb={2} size="md">
              Secure Auth
            </FLPHeading>
            <FLPText color={{ base: "gray.600", _dark: "gray.400" }} fontSize="sm">
              Powered by Supabase Security. Log in instantly with email magic links or standard
              password credentials.
            </FLPText>
          </Box>
        </Grid>
      </FLPBox>
    </FLPBox>
  );
};

export default Index;
