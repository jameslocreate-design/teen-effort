export const AGE_MISMATCH_MESSAGE =
  "For safety, teens can only connect with other teens, and adults with other adults.";

export const isAgeMismatch = (error: unknown): boolean => {
  const message = (error as { message?: string } | null)?.message ?? "";
  return message.includes("AGE_GROUP_MISMATCH");
};
