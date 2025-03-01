import { PluginItem, types, NodePath } from "@babel/core";
import { babel } from "@rollup/plugin-babel";

import UBinding from "./UBinding";
import UFunctionLike from "./UFunctionLike";
import UNodePath from "./UNodePath";
import UObjectPattern from "./UObjectPattern";
import UTypeAnnotation from "./UTypeAnnotation";
import UTSType from "./UTSType";
import UProgram from "./UProgram";
import UNode from "./UNode";

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
        UFunctionLike.typeNames.map((type) => [
          type,
          (path: NodePath<UFunctionLike>) => {
            const param = path.node.params[0];
            if (param?.type !== "ObjectPattern") return;

            const typeIdentifier = UTypeAnnotation.identifier(
              param.typeAnnotation
            );
            if (!validTypeIdentifier(typeIdentifier, path)) return;

            const propsIdentifier = undestructure(param, {
              path,
              insertStatments(...statements) {
                UFunctionLike.Path.mut.prependStatement(path, ...statements);
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
            path.parentPath.parentPath!.insertAfter(statements);
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
      if (typeIdentifier.name !== "D") return;
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
        UProgram.Path.importSpecifier.mut.findOrInsert(
          program,
          "mergeProps",
          "solid-js"
        );

      const memos: types.VariableDeclaration[] = [];
      insertStatments(
        types.expressionStatement(
          types.assignmentExpression(
            "=",
            propsIdentifier,
            types.callExpression(mergePropsSpecifier.local, [
              types.objectExpression(
                defaults.map(([key, value]) => {
                  if (
                    !UNode.findChild(
                      value,
                      (node) => node.type === "Identifier"
                    )
                  )
                    return types.objectProperty(key, value);

                  // Memoize derived defaults, useful for scenarios like `id =
                  // createid()` where referencing id multiple times would
                  // otherwise create multiple ids
                  const createMemoSpecifier =
                    UProgram.Path.importSpecifier.mut.findOrInsert(
                      program,
                      "createMemo",
                      "solid-js"
                    );
                  const memoIdentifier = program.scope.generateUidIdentifier(
                    key.type === "StringLiteral" ? key.value : undefined
                  );
                  memos.push(
                    types.variableDeclaration("const", [
                      types.variableDeclarator(
                        memoIdentifier,
                        types.callExpression(createMemoSpecifier.local, [
                          types.arrowFunctionExpression([], value),
                        ])
                      ),
                    ])
                  );
                  // Derive default when default contains identifier, without
                  // this reactivity will be lost
                  return types.objectMethod(
                    "get",
                    key,
                    [],
                    types.blockStatement([
                      types.returnStatement(
                        types.callExpression(memoIdentifier, [])
                      ),
                    ])
                  );
                })
              ),
              propsIdentifier,
            ])
          )
        ),
        // Memos must come last because they are eagerly evaluated, derived
        // default get properties are lazy so they can reference the memos
        // anyways
        ...memos
      );
    }

    // splitProps
    if (restElement) {
      const splitPropsSpecifier =
        UProgram.Path.importSpecifier.mut.findOrInsert(
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
              types.arrayExpression(keys),
            ])
          )
        )
      );
    }

    // Transform references
    for (const key of keys) {
      // Use non-computed member expression syntax where possible:
      // `props.a` instead of `props["a"]`
      const [member, shortHand] =
        key.type === "StringLiteral" && /^\w+$/i.test(key.value)
          ? [types.identifier(key.value), true]
          : [key, false];
      const undestructuredProp = types.memberExpression(
        propsIdentifier,
        member,
        !shortHand
      );

      // Find new bindings for identifiers added in transforms above
      // - Derived defaults
      path.scope.crawl();
      const componentScopeBindings = path.scope.bindings;
      const { referencePaths, constantViolations } =
        componentScopeBindings[
          renames.get(key)?.name || (key as types.StringLiteral).value
        ]!;

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
