# pg-client-helper

A Postgres `pg` client based helper which:

- provides async query functions explicitly returning multiple rows, a single row, a scalar value or nothing
- allows you to write SQL queries with named parameters (instead of positional parameters)
- handles your connections
- supports transactions (since v1.1.0)

## Logging

**pg-client-helper** logs out certain events. To control the level use the **PG_CLIENT_HELPER_LOGLEVEL** environment variable. Valid values are:

- `DEBUG`
- `INFO`
- `WARN`
- `ERROR`
- `SILENT` (default)

## Query Functions

**pg-client-helper** provides the following async query functions:

| Function Name     | Description                                | Suitable for                                               |
| ----------------- | ------------------------------------------ | ---------------------------------------------------------- |
| **queryMultiple** | _returns an array of rows_                 | `SELECT * FROM public.users`                               |
| **queryMultipleScalar** | _returns an array of values (the first value of each row)_                 | `SELECT user_name FROM public.users`                               |
| **querySingle**   | _returns the first row as an object_       | `SElECT * FROM public.users WHERE id_users = 1337`         |
| **queryScalar**   | _returns the first value of the first row_ | `SELECT user_name FROM public.users WHERE id_users = 1337` |
| **query**         | _return null_                              | `DELETE FROM public.users WHERE id_users = 1337`           |

## Named Parameters

### You can provide named parameters in your `query` and the `params` object. These parameters must start with a Dollar sign (`$`).

**Example**:

```js
import * as PG from "pg-client-helper";

const query = `
    INSERT INTO public.users (
        user_name
        , email_address
        , active
    )
    VALUES (
        $user_name
        , $email_address
        , $active
    )`;

const params = {
  $user_name: "John Doe",
  $email_address: "john_doe@some.tld",
  $active: true,
};

await PG.query(query, params);
```

<details><summary>Inner workings:</summary>

**pg-client-helper**

- takes your params object
- iterates through all properties sorted descending by the length of their names
- builds up the params array as expected by the `pg` client
- replaces all occurences of the property name with the index expected by the `pg` client

So ultimately the query run with `pg` will be:

```js
await pg.query(
  `    INSERT INTO public.users (
        user_name
        , email_address
        , active
    )
    VALUES (
        $2
        , $1
        , $3
    )`,
  ["john_doe@some.tld", "John Doe", true]
);
```

</details>

### If an attribute of your params object is an **Array**, **pg-client-helper** will spread the content of the array into the parameter list.

**Example**:

```js
import * as PG from "pg-client-helper";

const query = `SELECT * FROM public.users WHERE id_users IN ($id_users)`;

const params = {
  $id_users = [13, 666, 1337]
};

await PG.queryMultiple(query, params);
```

<details><summary>Inner workings:</summary>

**pg-client-helper** spreads the content of the $id_users array into the parameter list.

So ultimately the query run with `pg` will be:

```js
await pg.query(
  `SELECT * FROM public.users WHERE id_users IN ($1, $2, $3)`,
  [13, 666, 1337]
);
```

</details>

### pg-client-helper is backwards compatible to the default `pg` parameter list:

```js
import * as PG from "pg-client-helper";

const query = `
    INSERT INTO public.users (
        user_name
        , email_address
        , active
    )
    VALUES (
        $1
        , $2
        , $3
    )`;

await PG.query(query, ["John Doe", "john_doe@some.tld", true]);
```

## Connection Handling

**pg-client-helper** manages your database connection by utilizing connection pooling. It also supports connections to AWS RDS via IAM using AWS Signer.

If you want to use transactions, please use the following approach:

```ts
import * as PG from "pg-client-helper";

async function myfunc() {
  // begin the transaction and get a client returned which must be used for ALL subsequent queries
  const client: any = await PG.beginTransaction();

  try {
    // 1st query
    const $id_mytable1 = await PG.query(
      `INSERT INTO mytable1 (val1) VALUES 'foo' RETURNING id_mytable1`,
      {},
      client
    );

    // 2nd query
    const $id_mytable2 = await PG.query(
      `INSERT INTO mytable2 (id_mytable1, val2) VALUES ($id_mytable1, 'bar')`,
      { $id_mytable1 },
      client
    );

    // 3rd query
    await PG.query(
      `UPDATE mytable3 SET val3 = 'baz' WHERE id_mytable1 = $id_mytable1 AND id_mytable2 = $id_mytable2`,
      { $id_mytable1, $id_mytable2 },
      client
    );

    await PG.commitTransaction(client); // commits all changes made since beginTransaction
  } catch (error) {
    if (client) {
      await PG.rollbackTransaction(client); // we faced an error after beginTransaction, roll back all changes since then
    }
  }
}
```

| Environment Variable    | Description                                                                                                                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PGHOST                  | **(Mandatory)** The hostname of your PostgreSQL server. This could be a local hostname, IP address, or a remote server address.                                                                                              |
| PGPORT                  | **(Mandatory)** The port number on which your PostgreSQL server is running. The default PostgreSQL port is `5432`.                                                                                                           |
| PGUSER                  | **(Mandatory)** The username you wish to authenticate with when connecting to your PostgreSQL server.                                                                                                                        |
| PGDATABASE              | **(Mandatory)** The name of the database you want to connect to on your PostgreSQL server.                                                                                                                                   |
| PGPASSWORD              | **(Optional)** The password associated with the provided `PGUSER`. If using `PG_USE_AWS_RDS_SIGNER` (see below), this is replaced by the IAM authentication.                                                                 |
| PGPOOLSIZE              | **(Optional)** Maximum number of connections in the pool (default: 10)                                                                 |
| PG_SSL_REQUIRED         | **(Optional)** If set to `true`, SSL will be required for connections. This helps ensure encrypted connections for added security.                                                                                           |
| PG_SSL_ALLOW_SELFSIGNED | **(Optional)** If set to `true`, self-signed SSL certificates will be allowed, which can be useful in development or internal network scenarios. It's generally recommended to use certified SSL certificates in production. |
| PG_USE_AWS_RDS_SIGNER   | **(Optional)** If set to `true`, the module will use AWS RDS Signer for IAM-based authentication to your RDS database. This means `PGPASSWORD` is not required as authentication is handled by the IAM role.                 |
