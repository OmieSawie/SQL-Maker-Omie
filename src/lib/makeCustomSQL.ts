import mysql from "mysql2";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const pool = mysql.createPool({
  host: process.env.HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_USER_PASSWORD,
  database: process.env.DATABASE,
}).promise();

type DataType = {
  [key: string]: string;
};

const dataType: DataType = { "id": "number", "title": "string", "description": "string" };

type NumberRange = {
  UpperLimit?: number;
  LowerLimit?: number;
  LessThan?: number;
  GreaterThan?: number;
  EqualTo?: number;
};

// Define the type for Filters
type Filters = {
  [key: string]: any;
};

function filterStringQuery(key: string, value: string): string {
  return `${key} LIKE ? AND `;
}

function filterNumberQuery(key: string, value: NumberRange): string {
  if (value.UpperLimit !== undefined && value.LowerLimit !== undefined) {
    return `${key} BETWEEN ? AND ? AND `;
  } else if (value.LessThan !== undefined) {
    return `${key} <= ? AND `;
  } else if (value.GreaterThan !== undefined) {
    return `${key} >= ? AND `;
  } else if (value.EqualTo !== undefined) {
    return `${key} = ? AND `;
  }
  return "";
}

const sendSQL = async (params: string[], filters: Filters) => {
  const tableName = "tutorials";
  let query = "SELECT ";
  const queryParams: any[] = [];

  try {
    if (params.length) {
      query += params.join(", ") + ` FROM ${tableName}`;
    } else {
      query += `* FROM ${tableName}`;
    }

    if (Object.keys(filters).length) {
      query += " WHERE ";
      for (const key in filters) {
        if (dataType[key] === "number") {
          const numberQuery = filterNumberQuery(key, filters[key]);
          if (numberQuery.includes("BETWEEN")) {
            queryParams.push(filters[key].LowerLimit, filters[key].UpperLimit);
          } else {
            queryParams.push(
              filters[key].LessThan ?? filters[key].GreaterThan ?? filters[key].EqualTo
            );
          }
          query += numberQuery;
        } else {
          query += filterStringQuery(key, filters[key]);
          queryParams.push(`%${filters[key]}%`);
        }
      }
      query = query.replace(/ AND $/, " ;");
    } else {
      query += " ;";
    }

    console.log("Generated Query =", query);

    const [rows] = await pool.query(query, queryParams);
    console.log([rows]);
    return rows;
  } catch (error) {
    console.error("Error executing SQL query:", error);
    throw new Error("The query is invalid, please check parameters.");
  }
};

export default sendSQL;
