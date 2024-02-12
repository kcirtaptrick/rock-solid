import { PluginItem, types, NodePath } from "@babel/core";
import { babel } from "@rollup/plugin-babel";

import UBinding from "./UBinding";
import UAnyFunction from "./UAnyFunction";
import UNodePath from "./UNodePath";
import UObjectPattern from "./UObjectPattern";
import UObjectProperty from "./UObjectProperty";
import UTypeAnnotation from "./UTypeAnnotation";

export default function babelPluginUndestructure() {
  return {
    name: "solid-undestructure" as const,
    visitor: {
      FunctionDeclaration: visitor,
      FunctionExpression: visitor,
      ArrowFunctionExpression: visitor,
    },
  } satisfies PluginItem;
}

babelPluginUndestructure.rollup = () => {
  return Object.assign(
    babel({
      plugins: [
        ["@babel/plugin-syntax-typescript", { isTSX: true }],
        babelPluginUndestructure(),
      ],
      extensions: [".tsx"],
      babelHelpers: "bundled",
    }),
    {
      enforce: "pre" as const,
    }
  );
};

babelPluginUndestructure.vite = babelPluginUndestructure.rollup;

function visitor(path: NodePath<UAnyFunction>) {
  if (!path.node.params[0]) return;

  // Check for type marker
  {
    const typeIdentifier = UTypeAnnotation.identifier(
      path.node.params[0].typeAnnotation
    );

    if (!typeIdentifier) return;

    const binding =
      path.scope.getAllBindingsOfKind("module")[typeIdentifier.name]!;

    if (
      !UBinding.matchesImport(binding, {
        name: "D",
        from: "@rock-solid/undestructure",
      })
    )
      return;
  }

  if (!UAnyFunction.params.firstIsDestructured(path.node)) return;

  const param = path.node.params[0];
  const { defaults, renames, keys, restElement } = UObjectPattern.info(param);

  const propsIdentifier =
    UNodePath.findProgram(path).scope.generateUidIdentifier("props");
  propsIdentifier.typeAnnotation = param.typeAnnotation;

  // mergeProps
  if (defaults.length > 0) {
    const mergePropsSpecifier =
      UNodePath.Program.importSpecifier.mut.findOrInsert(
        UNodePath.findProgram(path),
        "mergeProps",
        "solid-js"
      );

    UAnyFunction.Path.mut.prependStatement(
      path,
      types.expressionStatement(
        types.assignmentExpression(
          "=",
          propsIdentifier,
          types.callExpression(mergePropsSpecifier.local, [
            types.objectExpression(
              defaults.map(([key, value]) => types.objectProperty(key, value))
            ),
            propsIdentifier,
          ])
        )
      )
    );
  }

  // splitProps
  if (restElement) {
    const splitPropsSpecifier =
      UNodePath.Program.importSpecifier.mut.findOrInsert(
        UNodePath.findProgram(path),
        "splitProps",
        "solid-js"
      );

    UAnyFunction.Path.mut.prependStatement(
      path,
      types.variableDeclaration("let", [
        types.variableDeclarator(restElement.argument),
      ]),
      types.expressionStatement(
        types.assignmentExpression(
          "=",
          types.arrayPattern([propsIdentifier, restElement.argument]),
          types.callExpression(splitPropsSpecifier.local, [
            propsIdentifier,
            types.arrayExpression(
              keys.map((key) =>
                types.stringLiteral(UObjectProperty.Key.staticName(key))
              )
            ),
          ])
        )
      )
    );
  }

  // Transform references
  for (const prop of keys) {
    const undestructuredProp = types.memberExpression(
      propsIdentifier,
      prop,
      prop.type === "StringLiteral"
    );

    // TODO: Find purpose
    // path.scope.crawl();
    const componentScopeBindings = path.scope.bindings;
    const keyName = UObjectProperty.Key.staticName(prop);
    const { referencePaths, constantViolations } =
      componentScopeBindings[renames[keyName]?.name || keyName]!;

    for (const referencePath of referencePaths)
      referencePath.replaceWith(undestructuredProp);

    // TODO: Find purpose
    // for (const constantViolation of constantViolations)
    //   if (constantViolation.node)
    //     constantViolation.node.left = undestructuredProp;
  }

  // @ts-ignore Previously narrowed type must be widened again
  path.node.params[0] = propsIdentifier;
}
