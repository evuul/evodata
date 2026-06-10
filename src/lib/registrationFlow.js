// Coordinates account persistence so registration does not leave partial users.

export const createAccountWithSession = async ({
  email,
  user,
  setJson,
  createSession,
  deleteKey,
  getUserKey,
}) => {
  const userKey = getUserKey(email);
  await setJson(userKey, user);

  try {
    const session = await createSession(email);
    return session;
  } catch (error) {
    await deleteKey(userKey).catch(() => {});
    throw error;
  }
};

export const runRegistrationAfterCommit = async ({ email, indexUser, sendWelcome }) => {
  const results = await Promise.allSettled([
    indexUser(email),
    sendWelcome(),
  ]);

  return {
    indexed: results[0]?.status === "fulfilled",
    welcomeSent: results[1]?.status === "fulfilled",
    failures: results
      .map((result, index) => (result.status === "rejected" ? { index, reason: result.reason } : null))
      .filter(Boolean),
  };
};
