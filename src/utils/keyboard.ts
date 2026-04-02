/** Поле ввода, селект или contenteditable — не перехватывать «служебные» клавиши как текст */
export function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'TEXTAREA') {
    return !(target as HTMLTextAreaElement).readOnly && !(target as HTMLTextAreaElement).disabled;
  }
  if (tag === 'SELECT') {
    return !(target as HTMLSelectElement).disabled;
  }
  if (tag === 'INPUT') {
    const input = target as HTMLInputElement;
    const t = input.type;
    if (t === 'button' || t === 'submit' || t === 'reset' || t === 'checkbox' || t === 'radio') {
      return false;
    }
    return !input.readOnly && !input.disabled;
  }
  return target.isContentEditable;
}
