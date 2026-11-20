import test from "node:test";
import assert from "node:assert/strict";
import { lightColors, darkColors } from "../theme/colors";
import typography from "../theme/typography";
import { getPreparingStage } from "../components/aiBotState";

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [R, G, B] = [toLinear(r), toLinear(g), toLinear(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(hexToRgb(fgHex));
  const l2 = relativeLuminance(hexToRgb(bgHex));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

test("WCAG 2.2 AA: lightColors text contrast >= 4.5:1 on background and surface", () => {
  for (const bg of [lightColors.background, lightColors.surface, lightColors.surfaceVariant]) {
    assert.ok(
      contrastRatio(lightColors.text.primary, bg) >= 4.5,
      `light text.primary on ${bg} must be >= 4.5`
    );
    assert.ok(
      contrastRatio(lightColors.text.secondary, bg) >= 4.5,
      `light text.secondary on ${bg} must be >= 4.5`
    );
    assert.ok(
      contrastRatio(lightColors.text.tertiary, bg) >= 4.5,
      `light text.tertiary on ${bg} must be >= 4.5`
    );
  }
});

test("WCAG 2.2 AA: darkColors text contrast >= 4.5:1 on background, surface, and surfaceVariant", () => {
  for (const bg of [darkColors.background, darkColors.surface, darkColors.surfaceVariant]) {
    assert.ok(
      contrastRatio(darkColors.text.primary, bg) >= 4.5,
      `dark text.primary on ${bg} must be >= 4.5`
    );
    assert.ok(
      contrastRatio(darkColors.text.secondary, bg) >= 4.5,
      `dark text.secondary on ${bg} must be >= 4.5`
    );
    assert.ok(
      contrastRatio(darkColors.text.tertiary, bg) >= 4.5,
      `dark text.tertiary on ${bg} must be >= 4.5`
    );
  }
});

test("WCAG 2.2 AA: semantic status colors and borderHeavy meet contrast thresholds", () => {
  assert.ok(
    contrastRatio(darkColors.error, darkColors.surface) >= 4.5,
    "darkColors.error on darkColors.surface >= 4.5:1"
  );
  assert.ok(
    contrastRatio(darkColors.success, darkColors.surface) >= 4.5,
    "darkColors.success on darkColors.surface >= 4.5:1"
  );
  assert.ok(
    contrastRatio(darkColors.warning, darkColors.surface) >= 4.5,
    "darkColors.warning on darkColors.surface >= 4.5:1"
  );
  assert.ok(
    contrastRatio(lightColors.error, lightColors.surface) >= 4.5,
    "lightColors.error on lightColors.surface >= 4.5:1"
  );
  assert.ok(
    contrastRatio(darkColors.borderHeavy, darkColors.background) >= 3.0,
    "darkColors.borderHeavy on darkColors.background >= 3.0:1 (SC 1.4.11)"
  );
});

test("Typography scale enforces minimum 12px font size for mobile legibility", () => {
  for (const [key, size] of Object.entries(typography.fontSize)) {
    assert.ok(size >= 12, `typography.fontSize.${key} (${size}px) must be >= 12px`);
  }
});

test("AiBotAvatar: getPreparingStage maps progress ratio to thinking -> happy stages", () => {
  const s1 = getPreparingStage(0.15);
  assert.equal(s1.state, "thinking");
  assert.match(s1.message, /Analisando seu perfil/i);

  const s2 = getPreparingStage(0.55);
  assert.equal(s2.state, "thinking");
  assert.match(s2.message, /Selecionando os melhores exercícios/i);

  const s3 = getPreparingStage(0.85);
  assert.equal(s3.state, "happy");
  assert.match(s3.message, /Ajustando séries e finalizando/i);
});

