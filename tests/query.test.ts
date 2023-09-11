// __tests__/pg-client-helper.test.ts

import * as PG from "../lib/pg-client-helper";
import { Pool } from "pg";

jest.mock("pg");

describe("pg-client-helper functions", () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    (Pool.prototype.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("queryMultiple should transform and send query correctly", async () => {
    const mockQuery = "SELECT * FROM users WHERE name = $name";
    const mockParams = { $name: "John" };
    const mockRows = [{ name: "John" }];

    mockClient.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await PG.queryMultiple(mockQuery, mockParams);

    expect(mockClient.query).toHaveBeenCalledWith(
      "SELECT * FROM users WHERE name = $1",
      ["John"]
    );
    expect(result).toEqual(mockRows);
  });

  it("query should transform and send query correctly without returning result", async () => {
    const mockQuery = "INSERT INTO users(name) VALUES($name)";
    const mockParams = { $name: "John" };

    // Mocking a return value
    mockClient.query.mockResolvedValueOnce({ rows: [] });

    await PG.query(mockQuery, mockParams);

    expect(mockClient.query).toHaveBeenCalledWith(
      "INSERT INTO users(name) VALUES($1)",
      ["John"]
    );
  });

  it("querySingle should return the first row of the result", async () => {
    const mockQuery = "SELECT * FROM users WHERE name = $name";
    const mockParams = { $name: "John" };
    const mockRows = [{ name: "John" }, { name: "Jane" }];

    mockClient.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await PG.querySingle(mockQuery, mockParams);

    expect(result).toEqual(mockRows[0]);
  });

  it("queryScalar should return the first value of the first row", async () => {
    const mockQuery = "SELECT name FROM users WHERE id = $id";
    const mockParams = { $id: 1 };
    const mockRows = [{ name: "John" }];

    mockClient.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await PG.queryScalar(mockQuery, mockParams);

    expect(result).toEqual(mockRows[0].name);
  });
});
