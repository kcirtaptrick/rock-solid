import { NodePath, types } from "@babel/core";
import { Tuple } from "record-tuple";
import UImportDeclaration from "./UImportDeclaration";
import UMap from "./UMap";

namespace UNodePath {
  export const findProgram = (nodePath: NodePath) =>
    nodePath.findParent((path) => path.isProgram()) as NodePath<types.Program>;

  export namespace Program {
    const importSpecifierCache = new Map<
      NodePath<types.Program>,
      Map<Tuple<[string, string]>, types.ImportSpecifier>
    >();

    export const importSpecifier = {
      find(programPath: NodePath<types.Program>, name: string, from: string) {
        const pathCache = UMap.getOr.lazy(
          importSpecifierCache,
          programPath,
          () => {
            const map = new Map();
            programPath.traverse({
              ImportDeclaration({ node }) {
                for (const specifier of node.specifiers) {
                  map.set(
                    Tuple(
                      UImportDeclaration.Specifier.name(specifier),
                      node.source.value
                    ),
                    specifier
                  );
                }
              },
            });
            return map;
          }
        );
        const key = Tuple(name, from);
        return pathCache.get(key);
      },
      mut: {
        insert(
          programPath: NodePath<types.Program>,
          name: string,
          from: string
        ) {
          const specifier = types.importSpecifier(
            programPath.scope.generateUidIdentifier(name),
            types.identifier(name)
          );
          programPath.node.body.unshift(
            types.importDeclaration([specifier], types.stringLiteral(from))
          );
          // Only update if cache for programPath exists, otherwise program will
          // be traversed on next find. We'll prevent this from happening if we
          // create it here, but we also don't want to perform a traversal here
          if (importSpecifierCache.has(programPath)) {
            importSpecifierCache
              .get(programPath)!
              .set(
                Tuple(UImportDeclaration.Specifier.name(specifier)!, from),
                specifier
              );
          }
          return specifier;
        },
        findOrInsert(
          programPath: NodePath<types.Program>,
          name: string,
          from: string
        ) {
          return (
            importSpecifier.find(programPath, name, from) ||
            importSpecifier.mut.insert(programPath, name, from)
          );
        },
      },
    };
  }
}

export default UNodePath;
