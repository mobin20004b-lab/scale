import test from "node:test"
import assert from "node:assert/strict"

import { shouldPreventDialogDismiss } from "../../lib/dialog-policy"

test("destructive dialogs prevent escape/overlay dismiss", () => {
  assert.equal(shouldPreventDialogDismiss("destructive"), true)
})

test("default dialogs allow escape/overlay dismiss", () => {
  assert.equal(shouldPreventDialogDismiss("default"), false)
})
