import { describe, expect, it } from 'vitest';
import { withProjectOption } from '../../../../src/util/projects/with-project-option';

describe('withProjectOption', () => {
  it('adds an explicit project to a command', () => {
    expect(withProjectOption('env pull', 'my-project')).toEqual(
      'env pull --project my-project'
    );
  });

  it('does not add an option without an explicit project', () => {
    expect(withProjectOption('env pull')).toEqual('env pull');
  });

  it('does not duplicate an existing project option', () => {
    expect(
      withProjectOption('env pull --project existing', 'my-project')
    ).toEqual('env pull --project existing');
  });

  it('inserts the project before a command separator', () => {
    expect(withProjectOption('env run -- npm test', 'my-project')).toEqual(
      'env run --project my-project -- npm test'
    );
  });

  it('ignores a child command project option after the command separator', () => {
    expect(
      withProjectOption(
        'env run -- npm test --project child-project',
        'my-project'
      )
    ).toEqual(
      'env run --project my-project -- npm test --project child-project'
    );
  });
});
