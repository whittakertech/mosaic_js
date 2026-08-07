import fs from "fs";
import path from "path";

/**
 * AUTO-GENERATED DOCUMENTATION SCRIPT
 *
 * Source of truth:
 *   src/state.ts → MOSAIC_TRANSITIONS
 *
 * Output:
 *   docs/documentation/_generated/drag-state-machine.md
 */

const stateFile = path.resolve("src/state.ts");
const outPath = path.resolve(
  "docs/documentation/_generated/drag-state-machine.mmd"
);

const source = fs.readFileSync(stateFile, "utf8");

/**
 * Extract the MOSAIC_TRANSITIONS object literal
 */
const match = source.match(
  /export const MOSAIC_TRANSITIONS\s*=\s*({[\s\S]*?})\s*as const/
);

if (!match) {
  throw new Error(
    "Could not find MOSAIC_TRANSITIONS in src/state.ts"
  );
}

/**
 * Normalize enum references:
 *   MosaicState.Idle → "Idle"
 */
const normalized = match[1].replace(
  /MosaicState\.([A-Za-z0-9_]+)/g,
  `"${"$1"}"`
);

/**
 * Safely evaluate the normalized object
 */
const transitions = Function(
  `"use strict"; return (${normalized});`
)() as Record<string, readonly string[]>;

/**
 * Emit Mermaid diagram
 */
const lines: string[] = [];

lines.push("stateDiagram-v2");
lines.push("    [*] --> Idle");

for (const [from, tos] of Object.entries(transitions)) {
  for (const to of tos) {
    lines.push(`    ${from} --> ${to}`);
  }
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n"), "utf8");

console.log("✓ Drag state machine generated");
