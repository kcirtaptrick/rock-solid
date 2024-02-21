import { Node, NodePath, types } from "@babel/core";

type UFunctionLike = Extract<
  Node,
  { type: (typeof UFunctionLike.typeNames)[number] }
>;

namespace UFunctionLike {
  export const typeNames = [
    "FunctionDeclaration",
    "FunctionExpression",
    "ArrowFunctionExpression",
    "ObjectMethod",
    "ClassMethod",
    "ClassPrivateMethod",
  ] satisfies Node["type"][];

  export const params = {
    firstIsDestructured<F extends UFunctionLike>(
      fdNode: F
    ): fdNode is F & {
      params: [types.ObjectPattern, ...F["params"]];
    } {
      const param = fdNode.params[0];

      return (
        param?.type === "ObjectPattern"
        // TODO: Find usecase, props likely don't receive a full object default
        // || (param.type === "AssignmentPattern" &&
        //   param.left.type === "ObjectPattern")
      );
    },
  };
  export namespace Path {
    export const mut = {
      prependStatement(
        path: NodePath<UFunctionLike>,
        ...statements: types.Statement[]
      ) {
        if (path.node.body.type === "BlockStatement")
          path.node.body.body.unshift(...statements);
        else
          path.node.body = types.blockStatement([
            ...statements,
            types.returnStatement(path.node.body),
          ]);
      },
    };
  }
}

export default UFunctionLike;
