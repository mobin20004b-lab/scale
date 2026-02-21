export type DialogCloseBehavior = "default" | "destructive"

export function shouldPreventDialogDismiss(behavior: DialogCloseBehavior) {
  return behavior === "destructive"
}

type FocusWrapDirection = "forward" | "backward"

export function getFocusWrapTargetIndex(
  currentIndex: number,
  focusableCount: number,
  direction: FocusWrapDirection,
) {
  if (focusableCount <= 1) {
    return null
  }

  if (direction === "forward" && currentIndex === focusableCount - 1) {
    return 0
  }

  if (direction === "backward" && (currentIndex <= 0 || currentIndex === -1)) {
    return focusableCount - 1
  }

  return null
}


export function getInitialFocusTarget(
  container: Pick<ParentNode, 'querySelector'>,
  selector?: string,
) {
  if (!selector) {
    return null
  }

  return container.querySelector<HTMLElement>(selector)
}
