import { PluginItem, types, NodePath } from "@babel/core";
import { babel } from "@rollup/plugin-babel";

import UBinding from "./UBinding";
import UFunctionNode from "./UFunctionNode";
import UNodePath from "./UNodePath";
import UObjectPattern from "./UObjectPattern";
import UObjectProperty from "./UObjectProperty";
import UTypeAnnotation from "./UTypeAnnotation";
import UTSType from "./UTSType";

declare namespace babelPluginUndestructure {
  type Options = {
    typeMarker?: {
      name: "D" | (string & {});
      from: "@rock-solid/undestructure" | "<global>" | (string & {});
    };
  };
}

function babelPluginUndestructure(
  options: babelPluginUndestructure.Options = {}
) {
  return {
    name: "solid-undestructure" as const,
    visitor: {
      ...Object.fromEntries(
        UFunctionNode.typeNames.map((type) => [
          type,
          (path: NodePath<UFunctionNode>) => {
            const param = path.node.params[0];
            if (param?.type !== "ObjectPattern") return;

            const typeIdentifier = UTypeAnnotation.identifier(
              param.typeAnnotation
            );
            if (!validTypeIdentifier(typeIdentifier, path)) return;

            const propsIdentifier = undestructure(param, {
              path,
              insertStatments(...statements) {
                UFunctionNode.Path.mut.prependStatement(path, ...statements);
              },
            });

            propsIdentifier.typeAnnotation = param.typeAnnotation;
            path.node.params[0] = propsIdentifier;
          },
        ])
      ),
      TSSatisfiesExpression(path) {
        if (path.parent.type !== "VariableDeclarator") return;
        if (path.parent.id.type !== "ObjectPattern") return;

        const typeIdentifier = UTSType.identifier(path.node.typeAnnotation);
        if (!validTypeIdentifier(typeIdentifier, path)) return;

        const propsIdentifier = undestructure(path.parent.id, {
          path,
          insertStatments(...statements) {
            path.parentPath!.parentPath!.insertAfter(statements);
          },
        });

        const declaration = path.parentPath.parent;
        if (
          declaration.type === "VariableDeclaration" &&
          declaration.kind === "const"
        )
          declaration.kind = "let";
        path.parent.id = propsIdentifier;
      },
    },
  } satisfies PluginItem;

  function validTypeIdentifier(
    typeIdentifier: types.Identifier | undefined,
    path: NodePath
  ) {
    if (!typeIdentifier) return;

    if (options.typeMarker?.from === "<global>") {
      if (path.scope.getAllBindings()[typeIdentifier.name]) return;
    } else if (
      !UBinding.matchesImport(
        path.scope.getAllBindingsOfKind("module")[typeIdentifier.name],
        {
          name: options.typeMarker?.name || "D",
          from: options.typeMarker?.from || "@rock-solid/undestructure",
        }
      )
    )
      return;
    return true;
  }

  function undestructure(
    objectPattern: types.ObjectPattern,
    {
      path,
      insertStatments,
    }: {
      path: NodePath;
      insertStatments: (...statements: types.Statement[]) => void;
    }
  ) {
    const { defaults, renames, keys, restElement } =
      UObjectPattern.info(objectPattern);

    const program = UNodePath.findProgram(path);

    const propsIdentifier = program.scope.generateUidIdentifier("props");

    // mergeProps
    if (defaults.length > 0) {
      const mergePropsSpecifier =
        UNodePath.Program.importSpecifier.mut.findOrInsert(
          program,
          "mergeProps",
          "solid-js"
        );

      insertStatments(
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
          program,
          "splitProps",
          "solid-js"
        );

      insertStatments(
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

    return propsIdentifier;
  }
}

export default babelPluginUndestructure;

babelPluginUndestructure.rollup = (
  options: babelPluginUndestructure.Options
) => {
  return Object.assign(
    babel({
      plugins: [
        ["@babel/plugin-syntax-typescript", { isTSX: true }],
        babelPluginUndestructure(options),
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
