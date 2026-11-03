// Revocation must finish before any destructive cleanup; failures leave the account intact.
export async function deleteAccountInOrder(steps: {
  revoke: () => Promise<void>;
  files: () => Promise<void>;
  rows: () => Promise<void>;
  auth: () => Promise<void>;
  token: () => Promise<void>;
}) {
  await steps.revoke();
  await steps.files();
  await steps.rows();
  await steps.auth();
  // Retain the token until deletion succeeds so failed cleanup can be retried safely.
  await steps.token();
}