export function getSubmitButton(
  container: HTMLElement,
  label: string,
): HTMLButtonElement {
  const button = container.querySelector(
    `button[type="submit"]`,
  ) as HTMLButtonElement | null;
  if (!button || button.textContent?.trim() !== label) {
    throw new Error(`Submit button "${label}" not found`);
  }
  return button;
}
