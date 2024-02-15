import { NodePath, types } from "@babel/core";

namespace UNodePath {
  export const findProgram = (nodePath: NodePath) =>
    nodePath.findParent((path) => path.isProgram()) as NodePath<types.Program>;
}

export default UNodePath;
