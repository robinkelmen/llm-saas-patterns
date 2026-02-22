/**
 * Source: Robin Kelmen — https://llmtuts.kelmen.space
 * Pattern: Spring Animation System
 * Docs:    https://llmtuts.kelmen.space/architecture/premium-feel/
 * Repo:    https://github.com/robinkelmen/llm-saas-patterns
 */

/**
 * Spring Animation Configurations
 *
 * Data-driven spring physics for Framer Motion.
 * Reference these by name instead of repeating values per-component.
 *
 * Physics guide:
 *   stiffness — how tight the spring is. Higher = faster, snappier.
 *   damping   — how much resistance. Higher = less bounce, slower stop.
 *   mass      — weight of the element. Higher = heavier, slower motion.
 *
 * Critically damped (damping² = 4 × stiffness × mass):
 *   Fastest arrival without overshoot. Professional feel.
 *
 * Underdamped (damping² < 4 × stiffness × mass):
 *   Slight oscillation. Adds directional emphasis.
 */

import type { Transition } from 'framer-motion'

export const SPRING_CONFIGS = {
  /**
   * Vertical slide — same-level navigation (Dashboard → Contacts)
   *
   * Subtle y: 8 → 0 lift. Small displacement keeps it professional.
   * stiffness: 200, damping: 25, mass: 0.8
   * Result: ~350-400ms, smooth and immediate
   */
  vertical: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
    mass: 0.8,
  },

  /**
   * Horizontal slide — depth navigation (List → Detail, tab switching)
   *
   * x: 12 → 0 slide communicates directional hierarchy.
   * stiffness: 220, damping: 24, mass: 0.9
   * Result: ~400-450ms with subtle directional feel
   */
  horizontal: {
    type: 'spring',
    stiffness: 220,
    damping: 24,
    mass: 0.9,
  },

  /**
   * Modal scale — dialogs and popups
   *
   * Quick scale-in from 0.95 → 1. Fast and snappy.
   * stiffness: 240, damping: 26, mass: 0.7
   */
  modal: {
    type: 'spring',
    stiffness: 240,
    damping: 26,
    mass: 0.7,
  },

  /**
   * Drawer slide — bottom sheets and side panels
   *
   * Smooth y slide-up for larger elements.
   * stiffness: 210, damping: 28, mass: 1
   */
  drawer: {
    type: 'spring',
    stiffness: 210,
    damping: 28,
    mass: 1,
  },

  /**
   * No animation — for prefers-reduced-motion
   * Always check useReducedMotion() and use this config when true.
   */
  none: {
    duration: 0,
  },
} as const satisfies Record<string, Transition>

export type SpringConfigKey = keyof typeof SPRING_CONFIGS
