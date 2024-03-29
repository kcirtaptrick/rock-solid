import { types } from "@babel/core";

namespace UObjectProperty {
  export type Key = types.ObjectProperty["key"];
  export namespace Key {
    export function isStatic(
      key: Key
    ): key is types.Identifier | types.StringLiteral {
      return key.type === "Identifier" || key.type === "StringLiteral";
    }
    isStatic.assert = (
      key: Key,
      message = "Key must be static."
    ): asserts key is types.Identifier | types.StringLiteral => {
      if (!isStatic(key)) throw new NonStaticError(message);
    };
    export class NonStaticError extends Error {
      name = "UObjectProperty.Key.NonStaticError";
    }
    export function staticName(key: Key): string {
      isStatic.assert(key, "staticName cannot be called with non-static key.");
      return (key.type === "Identifier" ? key.name : key.value) as any;
    }
  }
}

export default UObjectProperty;
