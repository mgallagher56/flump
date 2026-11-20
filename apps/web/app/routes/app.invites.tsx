import {
  BetaAdminDeleteResponse,
  BetaInviteListResponse,
  BetaMemberListResponse,
  CreateBetaInviteRequest,
  CreateBetaInviteResponse,
} from "@flump/api-contract";
import { Button, FormField, PageBody, PageHeader, PageSection, TextInput } from "@repo/ui";
import { Link2, Users } from "lucide-react";
import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, useFetcher, useLoaderData } from "react-router";
import { InviteList } from "~/features/invites/components/InviteList";
import { MemberList } from "~/features/invites/components/MemberList";
import { NewInviteLink } from "~/features/invites/components/NewInviteLink";
import { expectedOrigin } from "~/security/csrf.server";
import { backendFetch } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { actionErrorResponse, throwRouteError } from "~/services/route-error.server";
import { getAuthSession } from "~/utils/auth.server";

export const meta: MetaFunction = () => [{ title: "Invites | Flump" }];

/**
 * The owner's invite page (admins in `BETA_ADMIN_USER_IDS` only). Everyone else gets the backend's
 * 404, shown as "We cannot find that page", so the page gives nothing away.
 */
export const loader = async (args: LoaderFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  if (!accessToken) throwRouteError(new BackendError("unauthorised", "/beta/admin"));
  try {
    const [invites, members] = await Promise.all([
      backendFetch("/beta/admin/invites", {
        accessToken,
        signal: args.request.signal,
        schema: BetaInviteListResponse,
      }),
      backendFetch("/beta/admin/members", {
        accessToken,
        signal: args.request.signal,
        schema: BetaMemberListResponse,
      }),
    ]);
    return data({ invites: invites.invites, members: members.members });
  } catch (error) {
    throwRouteError(error);
  }
};

export type InvitesActionData =
  | { intent: "create"; link: string; expiresAt: string; label: string | null }
  | { intent: "cancel" | "remove"; success: true }
  | { success: false; error: string };

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  if (!accessToken) throwRouteError(new BackendError("unauthorised", "/beta/admin"));
  const form = await args.request.formData();
  const intent = form.get("intent");
  try {
    if (intent === "create") {
      const label = String(form.get("label") ?? "").trim();
      const body = CreateBetaInviteRequest.parse(label ? { label } : {});
      const created = await backendFetch("/beta/admin/invites", {
        accessToken,
        method: "POST",
        body,
        idempotencyKey: false,
        schema: CreateBetaInviteResponse,
      });
      // Built from the address the admin is using, so the link opens the same app.
      const link = `${expectedOrigin(args.request)}/invite/${created.token}`;
      return data<InvitesActionData>(
        { intent: "create", link, expiresAt: created.expiresAt, label: created.label },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (intent === "cancel" || intent === "remove") {
      const id = encodeURIComponent(String(form.get("id") ?? ""));
      if (intent === "cancel") {
        await backendFetch(`/beta/admin/invites/${id}`, {
          accessToken,
          method: "DELETE",
          schema: BetaAdminDeleteResponse,
        });
      } else {
        await backendFetch(`/beta/admin/members/${id}`, {
          accessToken,
          method: "DELETE",
          schema: BetaAdminDeleteResponse,
        });
      }
      return data<InvitesActionData>({ intent, success: true });
    }
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return data<InvitesActionData>(
        { success: false, error: "Keep the label to 60 characters or fewer." },
        { status: 400 },
      );
    }
    return actionErrorResponse(error);
  }
  return data<InvitesActionData>(
    { success: false, error: "That did not work. Try again." },
    { status: 400 },
  );
};

const InvitesRoute = (): ReactElement => {
  const { invites, members } = useLoaderData<typeof loader>();
  const create = useFetcher<InvitesActionData>();
  const cancel = useFetcher<InvitesActionData>();
  const remove = useFetcher<InvitesActionData>();
  const created =
    create.data && "intent" in create.data && create.data.intent === "create" ? create.data : null;
  const createError = create.data && "error" in create.data ? create.data.error : undefined;
  const removeError =
    remove.state === "idle" && remove.data && "error" in remove.data ? remove.data.error : null;

  return (
    <PageBody>
      <PageHeader
        description="Invite links let people join the private test. Each works once."
        title="Invites"
      />
      <PageSection
        description="Add a label to remember who it is for. Only you see it."
        icon={Link2}
        title="Create an invite link"
      >
        <create.Form method="post">
          <input name="intent" type="hidden" value="create" />
          <FormField error={createError} label="Label" optional>
            {(field) => (
              <TextInput
                aria-describedby={field.describedBy}
                aria-invalid={field.invalid || undefined}
                autoComplete="off"
                id={field.id}
                maxLength={60}
                name="label"
              />
            )}
          </FormField>
          <Button disabled={create.state !== "idle"} type="submit" variant="primary">
            {create.state !== "idle" ? "Creating…" : "Create invite link"}
          </Button>
        </create.Form>
        {created ? (
          <NewInviteLink expiresAt={created.expiresAt} label={created.label} link={created.link} />
        ) : null}
      </PageSection>
      <PageSection
        description="Links from the last 30 days. You can cancel a link nobody has used."
        icon={Link2}
        title="Invite links"
      >
        <InviteList
          invites={invites}
          pendingId={cancel.state !== "idle" ? String(cancel.formData?.get("id") ?? "") : null}
          onCancel={(id) => cancel.submit({ intent: "cancel", id }, { method: "post" })}
        />
      </PageSection>
      <PageSection
        description="People who joined through an invite link."
        icon={Users}
        title="People with access"
      >
        <MemberList
          error={removeError}
          members={members}
          pending={remove.state !== "idle"}
          onRemove={(userId) => remove.submit({ intent: "remove", id: userId }, { method: "post" })}
        />
      </PageSection>
    </PageBody>
  );
};

export default InvitesRoute;
