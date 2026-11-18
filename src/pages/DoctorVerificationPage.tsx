import { Link } from 'react-router-dom';
import { FormError } from '../components/FormError';
import { Spinner } from '../components/Spinner';
import { CredentialList } from '../features/verification/components/CredentialList';
import { CredentialUploadForm } from '../features/verification/components/CredentialUploadForm';
import { SpecialtyClaimPicker } from '../features/verification/components/SpecialtyClaimPicker';
import { VerificationChecklist } from '../features/verification/components/VerificationChecklist';
import { VerificationStatusBanner } from '../features/verification/components/VerificationStatusBanner';
import {
  useCredentials,
  useDoctorProfile,
  useSpecialtyCatalog,
  useSpecialtyClaims,
} from '../features/verification/hooks/useVerification';
import type { DoctorCredential, DoctorSpecialtyClaim } from '../types/models';

function messageFrom(error: unknown, fallback: string): string {
  // Keep the server's sentence whenever there is one: "The license is expired."
  // tells a doctor what to fix, a generic line does not.
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

/** `DoctorProfile` carries no rejection reason, so the profile-level banner
 * reads the newest rejected item — the application was rejected *because* of
 * something the per-item rows already name. */
function deriveRejectionReason(
  credentials: readonly DoctorCredential[],
  claims: readonly DoctorSpecialtyClaim[],
): string | null {
  const rejected = [
    ...credentials.filter((item) => item.status === 'rejected'),
    ...claims.filter((item) => item.status === 'rejected'),
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return rejected[0]?.rejectionReason ?? null;
}

export function DoctorVerificationPage() {
  const profileQuery = useDoctorProfile();
  const credentialsQuery = useCredentials();
  const catalogQuery = useSpecialtyCatalog();
  const claimsQuery = useSpecialtyClaims();

  const credentials = credentialsQuery.data ?? [];
  const claims = claimsQuery.data ?? [];

  return (
    <div className="container">
      <div className="card">
        <h1>Doctor verification application</h1>
        <p>
          Upload your credentials, claim your specialties, and follow each item through review. Documents are read by
          reviewers through a get-on-demand link, so nothing here shows a permanent URL for an upload.
        </p>
        <nav>
          <Link to="/doctor">Back to the doctor area</Link>
        </nav>
      </div>

      {profileQuery.isPending && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Spinner size={20} />
          <span>Loading your application…</span>
        </div>
      )}

      {profileQuery.isError && (
        <div className="card">
          <FormError
            message={messageFrom(profileQuery.error, 'We could not read your application status. Reload to retry.')}
          />
        </div>
      )}

      {profileQuery.data && (
        <div className="card">
          <VerificationStatusBanner
            status={profileQuery.data.verificationStatus}
            rejectionReason={deriveRejectionReason(credentials, claims)}
            fullName={profileQuery.data.fullName}
          />
        </div>
      )}

      <div className="card">
        <VerificationChecklist credentials={credentials} claims={claims} />
      </div>

      <div className="card">
        <CredentialUploadForm />
      </div>

      <section className="card" aria-labelledby="verification-documents-title">
        <h2 id="verification-documents-title">Your documents</h2>
        <CredentialList
          credentials={credentials}
          isLoading={credentialsQuery.isPending}
          error={credentialsQuery.isError ? messageFrom(credentialsQuery.error, 'Could not load your documents.') : null}
        />
      </section>

      <section className="card" aria-labelledby="verification-specialties-title">
        <h2 id="verification-specialties-title">Specialty claims</h2>
        <SpecialtyClaimPicker
          catalog={catalogQuery.data ?? []}
          claims={claims}
          isLoading={catalogQuery.isPending}
          error={catalogQuery.isError ? messageFrom(catalogQuery.error, 'Could not load the specialty catalog.') : null}
        />
      </section>
    </div>
  );
}
