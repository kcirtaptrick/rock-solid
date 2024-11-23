import { describe, expect, expectTypeOf, test } from "vitest";
import { types } from "@babel/core";
import { parse } from "@babel/parser";
import UNode from "./UNode";

describe("findChild", () => {
  test("Simple expression", () => {
    {
      const res = UNode.findChild(
        parse("a"),
        (node) => node.type === "Identifier"
      );

      expect(res!.type).toBe("Identifier");
      expectTypeOf(res).toMatchTypeOf<types.Identifier | undefined>();

      expect(res!.name).toBe("a");
    }
    {
      const res = UNode.findChild(
        parse("1"),
        (node) => node.type === "Identifier"
      );

      expect(res).toBeUndefined();
    }
    {
      const res = UNode.findChild(
        parse("1"),
        (node) => node.type === "NumericLiteral"
      );

      expect(res!.type).toBe("NumericLiteral");
      expect(res!.value).toBe(1);
    }
  });
  test("Nested expression", () => {
    {
      const res = UNode.findChild(
        parse("1 + 2 + a"),
        (node) => node.type === "Identifier"
      );

      expect(res!.type).toBe("Identifier");
      expectTypeOf(res).toMatchTypeOf<types.Identifier | undefined>();

      expect(res!.name).toBe("a");
    }
    {
      const res = UNode.findChild(
        parse("1 + 2 + {}[a]"),
        (node) => node.type === "Identifier"
      );

      expect(res!.type).toBe("Identifier");
      expectTypeOf(res).toMatchTypeOf<types.Identifier | undefined>();

      expect(res!.name).toBe("a");
    }
  });
});
