import type Client from '../client';
import { detectExplicitScope } from '../get-scope';
import { getLinkedProject, type ProjectLinkResultWithOrgId } from './link';
import { printProjectNotFoundError } from './project-not-found-error';

export interface ResolveProjectContextOptions {
  client: Client;
  cwd?: string;
  projectNameOrId?: string;
}

/**
 * Resolves project context for commands that optionally accept an explicit
 * project name or ID.
 *
 * Resolution is non-mutating: this function never links the directory or
 * creates a project. When an explicit project cannot be found, it emits the
 * standard project-not-found error instead of returning `not_linked`, which
 * would incorrectly suggest passing the flag that was already supplied.
 */
export async function resolveProjectContext({
  client,
  cwd = client.cwd,
  projectNameOrId,
}: ResolveProjectContextOptions): Promise<ProjectLinkResultWithOrgId> {
  const context = await getLinkedProject(client, {
    cwd,
    projectName: projectNameOrId,
    projectNameIsExplicit: Boolean(projectNameOrId),
    scopeIsExplicit: detectExplicitScope(client),
  });

  if (context.status === 'not_linked' && projectNameOrId) {
    await printProjectNotFoundError(
      client,
      projectNameOrId,
      context.orgId
    );
    return {
      status: 'error',
      exitCode: 1,
      orgId: context.orgId,
    };
  }

  return context;
}
