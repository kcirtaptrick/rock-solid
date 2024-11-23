import { Node, NodePath, traverse, types } from "@babel/core";

namespace UNode {
  export function findChild<T extends Node>(
    node: Node,
    predicate: (node: Node) => node is T
  ): T | undefined;
  export function findChild(
    node: Node,
    predicate: (node: Node) => any
  ): Node | undefined;
  export function findChild(
    node: Node,
    predicate: (node: Node) => any
  ): Node | undefined {
    if (predicate(node)) return node;

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (types.isNode(item)) {
            if (predicate(item)) return item;
            const res = findChild(item, predicate);
            if (res) return res;
          }
        }
      } else if (types.isNode(value)) {
        if (predicate(value)) return value;
        const res = findChild(value, predicate);
        if (res) return res;
      }
    }
  }
}

export default UNode;
