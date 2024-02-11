import {
  Identifier,
  ObjectPattern,
  Expression,
  RestElement,
  StringLiteral,
} from "@babel/types";
import UObjectProperty from "./UObjectProperty";

namespace UObjectPattern {
  export const defaults = (objectPattern: ObjectPattern) =>
    Object.fromEntries(
      objectPattern.properties.flatMap((prop) =>
        prop.type === "ObjectProperty" &&
        prop.value.type === "AssignmentPattern"
          ? [[prop.key, prop.value.right]]
          : []
      )
    );

  const initialInfo = {
    keys: () => [] as (Identifier | StringLiteral)[],
    defaults: () => [] as [Identifier | StringLiteral, Expression][],
    renames: () => ({}) as Record<string, Identifier>,
    restElement: () => null as RestElement | null,
  };

  export function info<Include extends (keyof typeof initialInfo)[]>(
    objectPattern: ObjectPattern,
    include: Include = Object.keys(initialInfo) as never
  ) {
    const res = Object.fromEntries(
      include.map((included) => [included, initialInfo[included]()])
    ) as {
      [Key in keyof typeof initialInfo]?: ReturnType<(typeof initialInfo)[Key]>;
    };

    for (const prop of objectPattern.properties) {
      if (prop.type === "RestElement") {
        if ("restElement" in res) res.restElement = prop;
        continue;
      }
      const { key, value } = prop;

      UObjectProperty.Key.isStatic.assert(key, "Non-static key not supported.");
      const keyName = UObjectProperty.Key.staticName(key);

      res.keys?.push(key);

      if (value.type !== "AssignmentPattern") {
        if (
          res.renames &&
          value.type === "Identifier" &&
          value.name !== keyName
        )
          res.renames[keyName] = value;
        continue;
      }

      if (value.type === "AssignmentPattern") {
        if (res.defaults) res.defaults.push([key, value.right]);

        if (
          res.renames &&
          value.left.type === "Identifier" &&
          value.left.name !== keyName
        )
          res.renames[keyName] = value.left;
      }
    }

    return res as {
      [Key in Include[number]]: ReturnType<(typeof initialInfo)[Key]>;
    };
  }
}

export default UObjectPattern;
