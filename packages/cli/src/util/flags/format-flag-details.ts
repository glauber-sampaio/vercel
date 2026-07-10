import chalk from 'chalk';
import ms from 'ms';
import { formatFlagConditionComparator } from './comparators';
import { formatVariantValue } from './resolve-variant';
import type {
  FlagCondition,
  FlagOutcome,
  FlagRolloutOutcome,
  FlagSettings,
  FlagSplitOutcome,
  FlagVariant,
} from './types';

export function resolveTargetingLabel(
  settings: FlagSettings | undefined,
  entityKind: string,
  attribute: string,
  value: string
): string | undefined {
  if (!settings) {
    return undefined;
  }

  const entity = settings.entities.find(e => e.kind === entityKind);
  if (!entity) {
    return undefined;
  }

  const attr = entity.attributes.find(a => a.key === attribute);
  if (!attr?.labels) {
    return undefined;
  }

  const labelEntry = attr.labels.find(l => l.value === value);
  return labelEntry?.label;
}

export function formatFlagEnvironmentOutcome(
  outcome: FlagOutcome | FlagSplitOutcome | FlagRolloutOutcome,
  variants: FlagVariant[],
  includeVariantId = false
): string {
  if (outcome.type === 'variant') {
    const variant = variants.find(v => v.id === outcome.variantId);
    return formatFlagEnvironmentVariantSummary(
      variant,
      outcome.variantId,
      includeVariantId
    );
  }

  if (outcome.type === 'split') {
    const weights = formatFlagSplitWeights(
      outcome.weights,
      variants,
      includeVariantId
    );
    return `split (${weights})`;
  }

  if (outcome.type === 'rollout') {
    return formatFlagRolloutOutcome(outcome, variants, includeVariantId);
  }

  return 'unknown';
}

export function formatFlagSplitWeights(
  weights: Record<string, number>,
  variants: FlagVariant[],
  includeVariantId = false
): string {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

  return Object.entries(weights)
    .map(([id, weight]) => {
      const variant = variants.find(v => v.id === id);
      const summary = formatFlagEnvironmentVariantSummary(
        variant,
        id,
        includeVariantId
      );
      const percentage = total > 0 ? (weight / total) * 100 : 0;
      const formattedPercentage = Number.isInteger(percentage)
        ? String(percentage)
        : String(Number(percentage.toFixed(2)));

      return `${summary}: ${formattedPercentage}%`;
    })
    .join(', ');
}

export function formatFlagEnvironmentVariantSummary(
  variant: FlagVariant | undefined,
  fallback: string,
  includeVariantId = false
): string {
  if (!variant) {
    return chalk.bold(fallback);
  }

  const summary = variant.label
    ? chalk.bold(variant.label)
    : chalk.bold(formatVariantValue(variant.value));

  return includeVariantId
    ? `${summary} ${chalk.dim(`(${variant.id})`)}`
    : summary;
}

export function formatFlagRolloutOutcome(
  outcome: FlagRolloutOutcome,
  variants: FlagVariant[],
  includeVariantId = false
): string {
  const fromVariant = variants.find(v => v.id === outcome.rollFromVariantId);
  const toVariant = variants.find(v => v.id === outcome.rollToVariantId);
  const defaultVariant = variants.find(v => v.id === outcome.defaultVariantId);
  const stages = outcome.slots
    .map(slot => {
      const percentage = slot.promille / 1000;
      const formattedPercentage = Number.isInteger(percentage)
        ? String(percentage)
        : String(Number(percentage.toFixed(3)));
      return `${formattedPercentage}% for ${ms(slot.durationMs, { long: true })}`;
    })
    .join(', ');

  return `${formatFlagEnvironmentVariantSummary(
    fromVariant,
    outcome.rollFromVariantId,
    includeVariantId
  )} -> ${formatFlagEnvironmentVariantSummary(
    toVariant,
    outcome.rollToVariantId,
    includeVariantId
  )}; ${stages}; then 100%; Fallback: ${formatFlagEnvironmentVariantSummary(
    defaultVariant,
    outcome.defaultVariantId,
    includeVariantId
  )}`;
}

export function formatFlagCondition(
  condition: FlagCondition,
  settings: FlagSettings | undefined
): { text: string; listItems?: string[] } {
  let lhs: string;
  if (condition.lhs.type === 'segment') {
    lhs = 'segment';
  } else {
    lhs = `${condition.lhs.kind}.${condition.lhs.attribute}`;
  }

  const cmp = chalk.dim(
    formatFlagConditionComparator(condition.cmp, condition.cmpOptions)
  );

  if (condition.rhs === undefined || condition.rhs === null) {
    return { text: `${lhs} ${cmp}` };
  }

  if (typeof condition.rhs === 'object') {
    if (
      (condition.rhs.type === 'list' || condition.rhs.type === 'list/inline') &&
      Array.isArray(condition.rhs.items)
    ) {
      const items = condition.rhs.items.map(item => {
        const itemValue =
          typeof item === 'object' && item !== null && 'value' in item
            ? String((item as { value: unknown }).value)
            : String(item);

        if (condition.lhs.type === 'entity') {
          const label = resolveTargetingLabel(
            settings,
            condition.lhs.kind,
            condition.lhs.attribute,
            itemValue
          );
          return label ? `${itemValue} ${chalk.gray(label)}` : itemValue;
        }

        return itemValue;
      });

      return { text: `${lhs} ${cmp}`, listItems: items };
    }

    return { text: `${lhs} ${cmp} ${JSON.stringify(condition.rhs)}` };
  }

  let rhs: string;
  if (condition.lhs.type === 'entity') {
    const label = resolveTargetingLabel(
      settings,
      condition.lhs.kind,
      condition.lhs.attribute,
      String(condition.rhs)
    );
    rhs = label
      ? `${condition.rhs} ${chalk.gray(label)}`
      : String(condition.rhs);
  } else {
    rhs = String(condition.rhs);
  }

  return { text: `${lhs} ${cmp} ${rhs}` };
}
