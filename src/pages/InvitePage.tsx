// Invite landing route (issue #81): `/#/invite?token=…`. The token is
// read once — from the URL, or from router state when returning from
// /login — and immediately stripped from the URL: it's a credential and
// must not linger in the address bar, history entries, or referrers. It
// is never written to localStorage/sessionStorage (ARCHITECTURE_ESSENTIALS
// hard rule); like the session itself it only lives in memory, so a
// reload of this page shows the invalid-link state and the person simply
// reopens the link from their email.
import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { InviteLanding } from '../features/invite/components/InviteLanding';

interface InviteNavState {
  inviteToken?: string;
}

export function InvitePage() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [urlToken] = useState(() => params.get('token'));
  const stateToken = (location.state as InviteNavState | null)?.inviteToken ?? null;
  const token = urlToken ?? stateToken;

  // Remove the token from the URL as soon as it has been read (issue #81
  // edge case). Router state is preserved so the log-in round trip still
  // works after the query string is cleared.
  useEffect(() => {
    if (params.has('token')) {
      setParams({}, { replace: true, state: location.state ?? null });
    }
  }, [params, setParams, location.state]);

  if (!token) {
    return (
      <div className="authContainer">
        <div className="card">
          <h1>Invalid link</h1>
          <p>
            This invitation link is missing or incomplete. Ask the person who invited you to send
            it again.
          </p>
          <p>
            <Link to="/">Back to home</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="authContainer">
      <div className="card">
        <InviteLanding token={token} />
      </div>
    </div>
  );
}
