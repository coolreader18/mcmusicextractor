export const hasOwnProperty = (
  obj: Object,
  v: string | number | symbol,
): boolean => Object.prototype.hasOwnProperty.call(obj, v);

export function fromEntries<K extends PropertyKey, V>(
  iter: Iterable<[K, V]>,
): { [k in K]: V } {
  const obj = {};

  for (const pair of iter) {
    if (Object(pair) !== pair) {
      throw new TypeError("iterable for fromEntries should yield objects");
    }

    // Consistency with Map: contract is that entry has "0" and "1" keys, not
    // that it is an array or iterable.

    const { "0": key, "1": val } = pair;

    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: val,
    });
  }

  return obj as any;
}
