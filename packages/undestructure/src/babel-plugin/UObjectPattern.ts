import { types } from "@babel/core";

namespace UObjectPattern {
  export const defaults = (objectPattern: types.ObjectPattern) =>
    Object.fromEntries(
      objectPattern.properties.flatMap((prop) =>
        prop.type === "ObjectProperty" &&
        prop.value.type === "AssignmentPattern"
          ? [[prop.key, prop.value.right]]
          : []
      )
    );

  const initialInfo = {
    keys: () => [] as types.Expression[],
    defaults: () => [] as [types.Expression, types.Expression][],
    renames: () => new Map<types.ObjectProperty["key"], types.Identifier>(),
    restElement: () => null as types.RestElement | null,
  };

  export function info<Include extends (keyof typeof initialInfo)[]>(
    objectPattern: types.ObjectPattern,
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
      const { key: _key, value, computed } = prop;
      // Replace non-computed identifiers with string literals to be able to
      // identify non-computed keys; identifiers can be both.
      const key =
        !computed && _key.type === "Identifier"
          ? types.stringLiteral(_key.name)
          : _key;

      if (key.type === "PrivateName")
        throw new Error("Field cannot be a private name.");

      res.keys?.push(key as types.Expression);

      if (value.type !== "AssignmentPattern" && value.type === "Identifier") {
        res.renames?.set(key, value);
        continue;
      }

      if (value.type === "AssignmentPattern") {
        if (res.defaults) res.defaults.push([key, value.right]);

        if (value.left.type === "Identifier") res.renames?.set(key, value.left);
      }
    }

    return res as {
      [Key in Include[number]]: ReturnType<(typeof initialInfo)[Key]>;
    };
  }
}

export default UObjectPattern;
