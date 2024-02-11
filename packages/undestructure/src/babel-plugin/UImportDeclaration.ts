import { ImportDeclaration } from "@babel/types";

export namespace UImportDeclaration {
  export type Specifier = ImportDeclaration["specifiers"][number];
  export namespace Specifier {
    // TOOD: Finish implmentation
    export function name(specifier: Specifier) {
      if (specifier.type === "ImportDefaultSpecifier") return "default";
      if (
        specifier.type === "ImportSpecifier" &&
        specifier.imported.type === "Identifier"
      )
        return specifier.imported.name;
    }
  }
}

export default UImportDeclaration;
