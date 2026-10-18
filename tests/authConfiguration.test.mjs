import test from "node:test";
import assert from "node:assert/strict";
import { getMissingAuthEnvironment } from "../src/lib/authConfiguration.ts";

test("auth configuration reports only missing variable names", () => {
  assert.deepStrictEqual(
    getMissingAuthEnvironment({
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
      NEXTAUTH_SECRET: "secret",
      NEXTAUTH_URL: "https://studio.example",
      AUTHORIZED_HOST_EMAIL: "host@example.com",
    }),
    []
  );

  assert.deepStrictEqual(
    getMissingAuthEnvironment({
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
      NEXTAUTH_SECRET: "secret",
      NEXTAUTH_URL: "https://studio.example",
    }),
    ["AUTHORIZED_HOST_EMAIL"]
  );

  assert.deepStrictEqual(
    getMissingAuthEnvironment({
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "  ",
      NEXTAUTH_SECRET: undefined,
      NEXTAUTH_URL: "https://studio.example",
      AUTHORIZED_HOST_EMAIL: "selva72007@gmail.com",
    }),
    ["GOOGLE_CLIENT_SECRET", "NEXTAUTH_SECRET"]
  );
});
