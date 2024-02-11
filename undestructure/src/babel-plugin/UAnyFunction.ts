import { NodePath, types } from "@babel/core";
import {
  FunctionDeclaration,
  ObjectPattern,
  FunctionExpression,
  ArrowFunctionExpression,
  Statement,
} from "@babel/types";

type UAnyFunction =
  | FunctionDeclaration
  | FunctionExpression
  | ArrowFunctionExpression;

namespace UAnyFunction {
  export const params = {
    firstIsDestructured<F extends UAnyFunction>(
      fdNode: F
    ): fdNode is F & {
      params: [ObjectPattern, ...F["params"]];
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
        path: NodePath<UAnyFunction>,
        ...statements: Statement[]
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

export default UAnyFunction;
