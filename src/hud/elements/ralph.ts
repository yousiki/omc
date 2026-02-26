/**
 * OMC HUD - Ralph Element
 *
 * Renders Ralph loop iteration display.
 */

import { RESET } from '../colors.js';
import type { HudThresholds, RalphStateForHud } from '../types.js';

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';

/**
 * Render Ralph loop state.
 * Returns null if ralph is not active.
 *
 * Format: ralph:3/10
 */
export function renderRalph(state: RalphStateForHud | null, thresholds: HudThresholds): string | null {
  if (!state?.active) {
    return null;
  }

  const { iteration, maxIterations } = state;
  const warningThreshold = thresholds.ralphWarning;
  const criticalThreshold = Math.floor(maxIterations * 0.9);

  let color: string;
  if (iteration >= criticalThreshold) {
    color = RED;
  } else if (iteration >= warningThreshold) {
    color = YELLOW;
  } else {
    color = GREEN;
  }

  return `ralph:${color}${iteration}/${maxIterations}${RESET}`;
}
