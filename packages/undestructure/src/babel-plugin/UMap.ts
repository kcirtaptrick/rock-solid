namespace UMap {
  export type Any = Map<any, any>;
  export type Key<M extends Any> = M extends Map<infer Key, any> ? Key : never;
  export type Value<M extends Any> =
    M extends Map<any, infer Value> ? Value : never;
  export function getOr<M extends Any>(
    map: M,
    key: Key<M>,
    defaultValue: Value<M>
  ) {
    if (!map.has(key)) {
      map.set(key, defaultValue);
    }
    return map.get(key);
  }
  getOr.lazy = <M extends Any>(
    map: M,
    key: Key<M>,
    getDefaultValue: () => Value<M>
  ): Value<M> => {
    if (!map.has(key)) {
      map.set(key, getDefaultValue());
    }
    return map.get(key);
  };
}

export default UMap;
