import type Client from '../client';
import type { ProjectLinkResult } from '@vercel-internals/types';
import { omitGlobalFlagsFromArgs } from '../agent-output';
import { getLinkedProject } from './link';
import { printProjectNotFoundError } from './project-not-found-error';
import { detectExplicitScope } from '../get-scope';

function getInvokingCommandFromArgv(argv: string[]): string {
  const args = omitGlobalFlagsFromArgs(argv.slice(2));
  const positionals: string[] = [];
  for (const arg of args) {
    if (arg.startsWith('-')) {
      break;
    }
    positionals.push(arg);
  }
  return positionals.join(' ');
}

/**
 * Resolves the project for commands that accept `--project` outside a linked
 * directory. New callers should use `resolveProjectContext()` directly.
 */
export async function getLinkedProjectOrFail(
  client: Client,
  projectName?: string
): Promise<ProjectLinkResult> {
  const link = await getLinkedProject(client, {
    cwd: client.cwd,
    projectName,
    projectNameIsExplicit: Boolean(projectName),
    scopeIsExplicit: detectExplicitScope(client),
  });

  if (link.status === 'not_linked' && projectName) {
    await printProjectNotFoundError(
      client,
      projectName,
      getInvokingCommandFromArgv(client.argv),
      link.orgId
    );
    return { status: 'error', exitCode: 1 };
  }

  return link;
}
