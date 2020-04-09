export function createCustomEvent(
  doc: Document,
  name: string,
  detail: any
): CustomEvent {
  const bubbles = false;
  const cancelable = false;
  if (typeof CustomEvent !== 'function') {
    const event = doc.createEvent('CustomEvent');
    event.initCustomEvent(name, bubbles, cancelable, detail);
    return event;
  }
  return new CustomEvent(name, {bubbles, cancelable, detail});
}
