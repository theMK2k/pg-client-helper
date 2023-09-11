import * as PG from "../lib/pg-client-helper";

describe("transformQuery", () => {
  it("should return query and parameters as-is if parameters are already an array", () => {
    const [query, params] = PG.transformQuery(
      "SELECT * FROM public.users WHERE id = $1",
      [1]
    );
    expect(query).toBe("SELECT * FROM public.users WHERE id = $1");
    expect(params).toEqual([1]);
  });

  it("should replace named parameters in the query with positional parameters", () => {
    const [query, params] = PG.transformQuery(
      "SELECT * FROM public.users WHERE name = $name AND age = $age",
      {
        $name: "John",
        $age: 25,
      }
    );
    expect(query).toBe(
      "SELECT * FROM public.users WHERE name = $1 AND age = $2"
    );
    expect(params).toEqual(["John", 25]);
  });

  it("should spread the contents of an array parameter", () => {
    const [query, params] = PG.transformQuery(
      "SELECT * FROM public.users WHERE id IN ($ids)",
      {
        $ids: [1, 2, 3],
      }
    );
    expect(query).toBe("SELECT * FROM public.users WHERE id IN ($1, $2, $3)");
    expect(params).toEqual([1, 2, 3]);
  });

  it("should handle mixed array and primitive parameters", () => {
    const [query, params] = PG.transformQuery(
      "SELECT * FROM public.users WHERE name = $name AND id IN ($ids)",
      {
        $name: "John",
        $ids: [1, 2],
      }
    );
    expect(query).toBe(
      "SELECT * FROM public.users WHERE name = $1 AND id IN ($2, $3)"
    );
    expect(params).toEqual(["John", 1, 2]);
  });

  it("should throw an error for invalid parameter names", () => {
    expect(() => {
      PG.transformQuery("SELECT * FROM public.users WHERE name = name", {
        name: "John",
      });
    }).toThrowError(
      "[PG.transformQuery] Invalid parameter name: \"name\", parameter names must start with a dollar sign '$'"
    );
  });

  it("should correctly handle longer parameter names being replaced before shorter ones", () => {
    const [query, params] = PG.transformQuery(
      "SELECT * FROM public.users WHERE field = $some_field_2 AND field2 = $some_field",
      {
        $some_field: "value",
        $some_field_2: "anotherValue",
      }
    );
    expect(query).toBe(
      "SELECT * FROM public.users WHERE field = $1 AND field2 = $2"
    );
    expect(params).toEqual(["anotherValue", "value"]);
  });

  it("should return the original query if no parameters are provided", () => {
    const [query, params] = PG.transformQuery("SELECT * FROM public.users");
    expect(query).toBe("SELECT * FROM public.users");
    expect(params).toBeUndefined();
  });

  it("should skip named parameters that are not present in the query string", () => {
    // Given
    const inputQuery = "SELECT * FROM users WHERE name = $name AND age = $age";
    const inputParams = {
      $name: "John Doe",
      $age: 30,
      $unusedParam: "This is unused",
    };

    // When
    const [transformedQuery, transformedParams] = PG.transformQuery(
      inputQuery,
      inputParams
    );

    // Then
    expect(transformedQuery).toBe(
      "SELECT * FROM users WHERE name = $1 AND age = $2"
    );
    expect(transformedParams).toEqual(["John Doe", 30]); // $unusedParam should not appear here
  });
});
