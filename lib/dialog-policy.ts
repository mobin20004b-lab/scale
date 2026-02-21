export type DialogCloseBehavior = "default" | "destructive"

export function shouldPreventDialogDismiss(behavior: DialogCloseBehavior) {
  return behavior === "destructive"
}
