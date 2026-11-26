export interface MfaRequiredResponse {
  mfaRequired: true;
  mfaToken: string;
}

export interface EnrollmentRequiredResponse {
  enrollmentRequired: true;
  enrollmentToken: string;
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUri: string;
}

export interface TwoFactorEnableResult {
  recoveryCodes: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
  unusedRecoveryCodes: number;
}
