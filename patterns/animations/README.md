# Spring Animation System

Data-driven spring physics for consistent, accessible motion in React apps.

## The Problem

Animation values scattered across components:

```typescript
// ContactsPage.tsx
transition={{ duration: 0.3, ease: 'easeOut' }}

// ProjectsPage.tsx
transition={{ duration: 0.2 }}

// Modal.tsx
transition={{ type: 'spring', stiffness: 300 }}  // Different values
```

No consistency, no accessibility support, physics values chosen by feel.

## The Solution

One configuration object. Every component references it by name.

```typescript
import { SPRING_CONFIGS } from '@/lib/animations/spring-configs'

// Page transition
<motion.div transition={SPRING_CONFIGS.vertical}>

// Detail view slide-in
<motion.div transition={SPRING_CONFIGS.horizontal}>

// Modal pop-in
<motion.div transition={SPRING_CONFIGS.modal}>
```

Change a spring config once — every animation using it updates.

## The Physics

Spring animations have three parameters that matter:

| Parameter | Effect | Higher value → |
|-----------|--------|----------------|
| `stiffness` | How tight the spring is | Faster, snappier motion |
| `damping` | How much resistance | Less bounce, slower stop |
| `mass` | Weight of the element | Heavier, slower motion |

The configs in this file are tuned for:
- Professional SaaS feel (not bouncy, not rigid)
- Small displacements (8-12px, not 40px+) that create cohesion without distraction
- Critically damped or lightly underdamped physics for each use case

## Accessibility

Always check `prefers-reduced-motion`. Users who have enabled it should get instant transitions:

```typescript
import { useReducedMotion } from 'framer-motion'

function AnimatedPage({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? SPRING_CONFIGS.none : SPRING_CONFIGS.vertical}
    >
      {children}
    </motion.div>
  )
}
```

## Files

- `spring-configs.ts` — Physics configurations for all animation types

## Requirements

- `framer-motion` — Spring physics engine

Full documentation: [The Premium Feel →](https://llmtuts.kelmen.space/architecture/premium-feel/)
