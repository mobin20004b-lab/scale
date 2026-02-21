import test from "node:test"
import assert from "node:assert/strict"

import {
  getFocusWrapTargetIndex,
  getInitialFocusTarget,
  shouldPreventDialogDismiss,
} from "../../lib/dialog-policy"

test("destructive dialogs prevent escape/overlay dismiss", () => {
  assert.equal(shouldPreventDialogDismiss("destructive"), true)
})

test("default dialogs allow escape/overlay dismiss", () => {
  assert.equal(shouldPreventDialogDismiss("default"), false)
})

test("focus wraps to first element on forward tab from last item", () => {
  assert.equal(getFocusWrapTargetIndex(3, 4, "forward"), 0)
})

test("focus wraps to last element on backward tab from first item", () => {
  assert.equal(getFocusWrapTargetIndex(0, 4, "backward"), 3)
})

test("focus does not wrap when not at the boundaries", () => {
  assert.equal(getFocusWrapTargetIndex(1, 4, "forward"), null)
  assert.equal(getFocusWrapTargetIndex(2, 4, "backward"), null)
})

test("single focusable element does not wrap", () => {
  assert.equal(getFocusWrapTargetIndex(0, 1, "forward"), null)
})

test("initial focus target returns null when selector is missing", () => {
  const container = {
    querySelector: () => null,
  }

  assert.equal(getInitialFocusTarget(container), null)
})

test("initial focus target resolves matching selector", () => {
  const marker = { id: "warehouse-name-input" }
  const container = {
    querySelector: (selector: string) => (selector === "#warehouse-name-input" ? marker : null),
  }

  assert.equal(getInitialFocusTarget(container, "#warehouse-name-input"), marker)
})
