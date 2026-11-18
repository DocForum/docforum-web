// Invitation redemption (issue #81, PRD OQ-2): admins and facility staff
// never self-register — they join through an invite link. The role shown
// here and the role the account gets both come from docforum-core's
// response for this token; there is deliberately no role input anywhere
// in this flow, so a tampered client cannot pick a role.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { TextField } from '../../../components/TextField';
import { ApiError } from '../../../services/api-client';
import { useSlowRequestHint } from '../../../hooks/useSlowRequestHint';
import { useAuthStore } from '../../../store/auth-store';
import { validateFullName, validatePassword } from '../../auth/validation';
import { useLogout } from '../../auth/hooks/useLogout';
import { useAcceptInvite, useInvite } from '../hooks/useInvite';
import type { AccountInvite, InviteRole } from '../../../types/models';
import styles from './InviteLanding.module.css';

export interface InviteLandingProps {
  token: string;
}

const ROLE_LABELS: Record<InviteRole, string> = {
  facility: 'Facility staff',
  admin: 'Administrator',
};

/** Where each invited role lands after accepting — mirrors RequireAuth's
 * role-gated home for that role. */
const DASHBOARDS: Record<InviteRole, string> = {
  facility: '/facility',
  admin: '/admin',
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function inviterDescription(invite: AccountInvite): string {
  return invite.invitedBy ?? 'your DocForum contact';
}

export function InviteLanding({ token }: InviteLandingProps) {
  const inviteQuery = useInvite(token);
  const acceptMutation = useAcceptInvite();
  const logout = useLogout();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const isSlow = useSlowRequestHint(inviteQuery.isPending);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; password?: string }>({});

  if (inviteQuery.isPending) {
    return (
      <div>
        <p className={styles.loading} role="status">
          <Spinner size={14} /> Checking your invitation…
        </p>
        {isSlow && (
          <p className={styles.notice} role="status">
            Still working — the server may be waking up after being idle. This can take up to a
            minute.
          </p>
        )}
      </div>
    );
  }

  if (inviteQuery.isError) {
    const error = inviteQuery.error;
    // 404 = unknown token — also covers an invite the server no longer
    // returns because it has already been used.
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div>
          <h1>Invitation not found</h1>
          <p className={styles.notice}>
            This invitation link isn’t valid — it may have already been used, or the link was
            copied incompletely. Ask the person who invited you to send a new link.
          </p>
          <p>
            <Link to="/">Back to home</Link>
          </p>
        </div>
      );
    }
    return (
      <div>
        <h1>Couldn’t check your invitation</h1>
        <p className={styles.notice}>
          {error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'}
        </p>
        <Button variant="secondary" onClick={() => inviteQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const invite = inviteQuery.data;
  if (!invite) return null; // Unreachable: pending/error handled above.

  if (invite.status !== 'pending') {
    const headings: Record<AccountInvite['status'], string> = {
      pending: '',
      expired: 'Invitation expired',
      revoked: 'Invitation revoked',
      accepted: 'Invitation already used',
    };
    const messages: Record<AccountInvite['status'], string> = {
      pending: '',
      expired: `This invitation expired on ${formatDate(invite.expiresAt)} and can no longer be used. Ask ${inviterDescription(invite)} to send you a new one.`,
      revoked: `This invitation was revoked and can no longer be used. If you still need access, contact ${inviterDescription(invite)}.`,
      accepted:
        'This invitation has already been used. If that was you, just log in — otherwise ask for a fresh invite.',
    };
    return (
      <div>
        <h1>{headings[invite.status]}</h1>
        <p className={styles.notice}>{messages[invite.status]}</p>
        {invite.status === 'accepted' ? (
          <p>
            <Link to="/login">Log in</Link> · <Link to="/">Back to home</Link>
          </p>
        ) : (
          <p>
            <Link to="/">Back to home</Link>
          </p>
        )}
      </div>
    );
  }

  const roleLabel = ROLE_LABELS[invite.role];
  const emailMatches =
    user !== null && user.email.toLowerCase() === invite.email.toLowerCase();

  const acceptError = acceptMutation.error
    ? acceptMutation.error instanceof ApiError
      ? acceptMutation.error.message
      : 'Something went wrong. Please try again.'
    : null;

  function goToDashboard() {
    navigate(DASHBOARDS[invite.role], { replace: true });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = {
      fullName: validateFullName(fullName),
      password: validatePassword(password),
    };
    setFieldErrors(errors);
    if (errors.fullName || errors.password) return;

    // No role in the payload — docforum-core derives it from the token.
    acceptMutation.mutate(
      { input: { token, email: invite.email, fullName: fullName.trim(), password } },
      { onSuccess: goToDashboard },
    );
  }

  function handleAcceptExisting() {
    // Existing user, already signed in: just the token + the invited
    // email (so the server can verify the match), sent with their
    // session. Still no role — never from the client.
    acceptMutation.mutate(
      { input: { token, email: invite.email } },
      { onSuccess: goToDashboard },
    );
  }

  return (
    <div>
      <h1>You’ve been invited</h1>
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Organisation</span>
          <span className={styles.summaryValue}>{invite.organisationName}</span>
        </div>
        {invite.organisationType && (
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Organisation type</span>
            <span className={styles.summaryValue}>{invite.organisationType}</span>
          </div>
        )}
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Role</span>
          <span className={styles.summaryValue}>
            <span className={styles.roleBadge}>{roleLabel}</span>
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Invited by</span>
          <span className={styles.summaryValue}>{invite.invitedBy ?? 'DocForum'}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Sent to</span>
          <span className={styles.summaryValue}>{invite.email}</span>
        </div>
      </div>

      {user && emailMatches && (
        <div className={styles.acceptActions}>
          <p className={styles.emailNote}>
            You’re signed in as {user.email}. Accepting gives this account the{' '}
            {roleLabel.toLowerCase()} role for {invite.organisationName}.
          </p>
          <FormError message={acceptError} />
          <Button onClick={handleAcceptExisting} loading={acceptMutation.isPending}>
            {acceptMutation.isPending ? 'Accepting…' : 'Accept invitation'}
          </Button>
        </div>
      )}

      {user && !emailMatches && (
        <div className={styles.acceptActions}>
          <p className={styles.notice}>
            This invitation was sent to <strong>{invite.email}</strong>, but you’re signed in as{' '}
            {user.email}. Sign out and continue with the invited account to accept it.
          </p>
          <Button
            variant="secondary"
            onClick={() => logout.mutate()}
            loading={logout.isPending}
          >
            Sign out
          </Button>
        </div>
      )}

      {!user && (
        <>
          <p className={styles.emailNote} id="invite-email-note">
            The invitation was sent to <strong>{invite.email}</strong>. Set up your name and
            password to create the account — the {roleLabel.toLowerCase()} role comes from this
            invitation and can’t be chosen here.
          </p>
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <TextField
              label="Full name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={fieldErrors.fullName}
            />
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              value={invite.email}
              readOnly
              aria-readonly
              aria-describedby="invite-email-note"
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
            />
            <FormError message={acceptError} />
            <Button type="submit" loading={acceptMutation.isPending}>
              {acceptMutation.isPending ? 'Creating account…' : 'Create account & accept invite'}
            </Button>
          </form>
          <p className={styles.emailNote}>
            Already have an account?{' '}
            <Link to="/login" state={{ inviteToken: token }}>
              Log in to accept this invitation
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}
