import { Binding } from "@babel/traverse";

namespace UBinding {
  export function matchesImport(
    binding: Binding | undefined,
    { name, from }: { name: string; from: string }
  ) {
    if (!binding) return false;

    const importSpecifier = binding.path.node;
    if (importSpecifier.type !== "ImportSpecifier") return false;

    const importDeclaration = binding.path.parent;
    if (importDeclaration.type !== "ImportDeclaration") return false;
    if (importDeclaration.source.value !== from) return false;

    const { imported } = importSpecifier;
    if (imported.type !== "Identifier") return false;
    if (imported.name !== name) return false;

    return true;
  }
}

export default UBinding;
