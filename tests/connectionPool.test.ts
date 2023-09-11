import * as PG from "../lib/pg-client-helper";
import { readFileSync } from "fs";
import { Signer } from "@aws-sdk/rds-signer";

// Mocking the dependencies
jest.mock("pg", () => {
  return {
    Pool: jest.fn(),
  };
});

jest.mock("fs");

jest.mock("@aws-sdk/rds-signer", () => {
  return {
    Signer: jest.fn().mockImplementation(() => ({
      getAuthToken: jest.fn().mockResolvedValue("MOCK_TOKEN"),
    })),
  };
});

describe("initPool function", () => {
  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  it("should initialize Pool without SSL when no related env vars are set", () => {
    PG.initPool();

    expect(require("pg").Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: false,
      })
    );
  });

  it("should initialize Pool with SSL when PG_SSL_REQUIRED is set", () => {
    process.env.PG_SSL_REQUIRED = "true";

    PG.initPool();

    expect(require("pg").Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: expect.objectContaining({
          require: true,
          rejectUnauthorized: false, // default behavior
        }),
      })
    );
  });

  it("should allow self-signed certificates when PG_SSL_ALLOW_SELFSIGNED is set", () => {
    process.env.PG_SSL_ALLOW_SELFSIGNED = "true";

    PG.initPool();

    expect(require("pg").Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: expect.objectContaining({
          rejectUnauthorized: false,
        }),
      })
    );
  });

  it("should use AWS RDS Signer when PG_USE_AWS_RDS_SIGNER is set", async () => {
    process.env.PG_USE_AWS_RDS_SIGNER = "true";
    process.env.PGHOST = "MOCK_HOST";
    process.env.PGPORT = "5432";
    process.env.PGUSER = "MOCK_USER";

    (readFileSync as jest.Mock).mockReturnValueOnce("MOCK_CA");

    await PG.initPool();

    expect(require("pg").Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        password: expect.any(Function),
        ssl: expect.objectContaining({
          rejectUnauthorized: false, // default behavior
          ca: "MOCK_CA",
        }),
      })
    );
  });
});
