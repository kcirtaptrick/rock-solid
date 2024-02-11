import { NodePath, types } from "@babel/core";
import { Program, ImportSpecifier } from "@babel/types";
import { Tuple } from "record-tuple";
import UImportDeclaration from "./UImportDeclaration";
import UMap from "./UMap";

namespace UNodePath {
  export const findProgram = (nodePath: NodePath) =>
    nodePath.findParent((path) => path.isProgram()) as NodePath<Program>;

  export namespace Program {
    const importSpecifierCache = new Map<
      NodePath<Program>,
      Map<Tuple<[string, string]>, ImportSpecifier>
    >();

    export const importSpecifier = {
      find(programPath: NodePath<Program>, name: string, from: string) {
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
        insert(programPath: NodePath<Program>, name: string, from: string) {
          const specifier = types.importSpecifier(
            programPath.scope.generateUidIdentifier(name),
            types.identifier(name)
          );
          programPath.node.body.unshift(
            types.importDeclaration([specifier], types.stringLiteral(from))
          );
          return specifier;
        },
        findOrInsert(
          programPath: NodePath<Program>,
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
