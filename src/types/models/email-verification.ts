/** `POST /auth/verify-email` response (issue #388). */
export interface EmailVerificationResult {
  emailVerifiedAt: string;
}

/** `POST /auth/verify-email/resend` response (issue #388). */
export interface EmailVerificationResendResult {
  resendAfterSeconds: number;
}
