/**
 * Adds an explicit project selector to a generated command while keeping the
 * flag before a `--` command separator. Returns the template unchanged when no
 * project was selected or the template already contains `--project`.
 */
export function withProjectOption(
  commandTemplate: string,
  projectNameOrId?: string
): string {
  if (!projectNameOrId) {
    return commandTemplate;
  }

  const separatorIndex = commandTemplate.indexOf(' -- ');
  const commandPrefix =
    separatorIndex === -1
      ? commandTemplate
      : commandTemplate.slice(0, separatorIndex);
  if (/(^|\s)--project(?:=|\s|$)/.test(commandPrefix)) {
    return commandTemplate;
  }

  const projectOption = `--project ${projectNameOrId}`;
  if (separatorIndex === -1) {
    return `${commandTemplate} ${projectOption}`;
  }

  return `${commandTemplate.slice(0, separatorIndex)} ${projectOption}${commandTemplate.slice(separatorIndex)}`;
}
