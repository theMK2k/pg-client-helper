/*
PG Client Helper v1.0.0

Copyright (c) 2023, Jörg 'MK2k' Sonntag, Steffen Stolze

Internet Consortium License (ISC)
*/

import { Pool } from "pg";
import { Signer } from "@aws-sdk/rds-signer";
import { readFileSync } from "fs";

console.log("[PG] Creating connection pool");

/**
 * PG CONNECTION POOL
 */
export function initPool(): Pool {
  let password: any = process.env.PGPASSWORD;

  let ca: string | undefined;
  let ssl: any = false;

  if (
    isTrue(process.env.PG_SSL_REQUIRED) ||
    isTrue(process.env.PG_SSL_ALLOW_SELFSIGNED)
  ) {
    ssl = {
      require: true,
      rejectUnauthorized: false,
    };

    if (isTrue(process.env.PG_SSL_REQUIRED)) {
      ssl.require = true;
    }
    if (isTrue(process.env.PG_SSL_ALLOW_SELFSIGNED)) {
      ssl.rejectUnauthorized = false;
    }
  }

  if (isTrue(process.env.PG_USE_AWS_RDS_SIGNER)) {
    // we want to use a signer and provide its function as the password
    console.log("[RDS SIGNER] providing function as password");

    try {
      ca = readFileSync("./rds-combined-ca-bundle.pem").toString(); // this cert is being downloaded in Dockerfile during docker build
    } catch (error) {
      throw new Error(
        `Failed to read CA Bundle: ${JSON.stringify(error, null, 2)}`
      );
    }

    const getAuthToken = async () => {
      console.log("[RDS SIGNER] START - getting auth token");
      const signer = new Signer({
        hostname: process.env.PGHOST!,
        port: +process.env.PGPORT!,
        username: process.env.PGUSER!,
      });
      return signer.getAuthToken();
    };

    // password = getAuthToken;
    password = getAuthToken;

    ssl = {
      rejectUnauthorized: !isTrue(process.env.PG_SSL_ALLOW_SELFSIGNED),
      ca,
    };
    if (isTrue(process.env.PG_SSL_REQUIRED)) {
      ssl.require = true;
    }
  }

  const pgPoolOptions: any = {
    host: process.env.PGHOST,
    port: +process.env.PGPORT!,
    user: process.env.PGUSER,
    password,
    database: process.env.PGDATABASE,
    ssl,
  };

  const pool: any = new Pool(pgPoolOptions);

  return pool;
}

const pool: Pool = initPool();

/**
 * Check if item is an array
 */
function isArray(item: any) {
  return item && Array.isArray(item);
}

/**
 * Check if value is true, 1 or "true"
 * @param value
 * @returns
 */
function isTrue(value: any) {
  return value === true || value === 1 || value?.toLowerCase() === "true";
}

/**
 * Transform query and query params from Object to Array
 *
 * If query params are already an array, return the query and params as-is
 *
 * Example:
 *
 * IN: query: `SELECT * FROM mytable WHERE some_field = $some_field, other_field = $other_field`
 *     queryParams: { $some_field: 'some_value', $other_field: 'other_value' }
 *
 * OUT: query: `SELECT * FROM mytable WHERE some_field = $1, other_field = $2`
 *      queryParams: ['some_value', 'other_value']
 *
 * @param in_query a SQL query with named parameters (param names are expected to start with a dollar sign '$')
 * @param in_params an object with named parameters
 * @returns [out_query, out_params]
 */
export function transformQuery(
  in_query: string,
  in_params?: Object | Array<any>
) {
  if (!in_params || Array.isArray(in_params)) {
    return [in_query, in_params];
  }

  const out_parameters: Array<any> = [];
  let out_query = in_query;

  const keys = Object.keys(in_params);
  keys.sort((a, b) => b.length - a.length); // Sort keys by length, descending, so that longer keys are replaced first, this prevents $some_field being replaced by $some_field_2

  for (const key of keys) {
    if (!key.startsWith("$")) {
      throw new Error(
        `[PG.transformQuery] Invalid parameter name: "${key}", parameter names must start with a dollar sign '$'`
      );
    }

    // Replace parameter keys with positional parameters
    // Escape the dollar sign in the key
    const escapedKey = key.replace(/\$/g, "\\$");
    const rxKey = new RegExp(escapedKey, "g");

    if (!rxKey.test(out_query)) {
      // key is not used in the query, so we can skip it
      continue;
    }

    if (isArray((<any>in_params)[key])) {
      // value is actually an array - so we need to concatenate $x, $x+1, $x+2, ... to the query
      let concatKeys = "";
      for (const item of (<any>in_params)[key]) {
        out_parameters.push(item);
        concatKeys += `${concatKeys ? ", " : ""}$${out_parameters.length}`;
      }
      out_query = out_query.replace(rxKey, concatKeys);
    } else {
      // default case: value is a primitive
      out_parameters.push((<any>in_params)[key]);
      out_query = out_query.replace(rxKey, `$${out_parameters.length}`);
    }
  }

  return [out_query, out_parameters];
}

export async function queryMultiple(
  query: string,
  queryParams?: Object | Array<any>
) {
  let client: any = null;
  try {
    client = await pool.connect();

    const transformedQueryAndParams = transformQuery(query, queryParams);

    console.log({ transformedQueryAndParams });

    const rows = (await client.query(...transformedQueryAndParams)).rows;

    return rows;
  } catch (error) {
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function query(query: string, queryParams?: Object | Array<any>) {
  await queryMultiple(query, queryParams);
}

export async function querySingle(
  query: string,
  queryParams?: Object | Array<any>
) {
  // console.log('QUERY SINGLE', query, queryParams);
  const rows = await queryMultiple(query, queryParams);
  return rows[0];
}

export async function queryScalar(
  query: string,
  queryParams?: Object | Array<any>
) {
  const row = await querySingle(query, queryParams);
  if (!row) {
    return null;
  }
  return row[Object.keys(row)[0]];
}

/*
export default {
    queryMultiple,
    querySingle,
    queryScalar,
    query,
    transformQuery,
};
*/
