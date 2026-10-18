import test from "node:test";
import assert from "node:assert/strict";
import { evaluateGoogleHostAuthorization } from "../src/lib/googleHostAuthorization.ts";

const allowedEmail = "selva72007@gmail.com";

test("accepts the configured verified Google account ignoring email case and whitespace", () => {
  assert.deepStrictEqual(
    evaluateGoogleHostAuthorization(
      { email: "  SELVA72007@GMAIL.COM ", email_verified: true },
      ` ${allowedEmail.toUpperCase()} `
    ),
    { authorized: true, reason: "authorized" }
  );
});

test("accepts Google's verified_email claim and rejects unverified profiles", () => {
  assert.deepStrictEqual(
    evaluateGoogleHostAuthorization(
      { email: allowedEmail, verified_email: true },
      allowedEmail
    ),
    { authorized: true, reason: "authorized" }
  );
  assert.deepStrictEqual(
    evaluateGoogleHostAuthorization(
      { email: allowedEmail, email_verified: false },
      allowedEmail
    ),
    { authorized: false, reason: "unverified_email" }
  );
});

test("rejects missing configuration, missing email, and non-host accounts", () => {
  assert.deepStrictEqual(
    evaluateGoogleHostAuthorization({ email: allowedEmail, email_verified: true }, "  "),
    { authorized: false, reason: "missing_configuration" }
  );
  assert.deepStrictEqual(
    evaluateGoogleHostAuthorization({ email_verified: true }, allowedEmail),
    { authorized: false, reason: "missing_email" }
  );
  assert.deepStrictEqual(
    evaluateGoogleHostAuthorization(
      { email: "someone-else@example.com", email_verified: true },
      allowedEmail
    ),
    { authorized: false, reason: "email_mismatch" }
  );
});
