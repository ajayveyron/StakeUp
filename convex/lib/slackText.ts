const SLACK_MRKDWN_REPLACEMENTS: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

export function escapeSlackMrkdwn(value: string) {
  return value.replace(/[&<>]/g, (char) => SLACK_MRKDWN_REPLACEMENTS[char]);
}

export function escapeOptionalSlackMrkdwn(value?: string) {
  return value ? escapeSlackMrkdwn(value) : value;
}
