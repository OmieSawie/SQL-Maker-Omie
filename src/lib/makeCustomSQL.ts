import mysql from "mysql2"
import * as dotenv from "dotenv";
import path from 'path'

const envPath = path.join(__dirname,'../.env');
dotenv.config({ path: envPath});

const pool = mysql.createPool({
  host: process.env.HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_USER_PASSWORD,
  database: process.env.DATABASE,
}).promise();


type DataType = {
  [key:string]:string;
}
const dataType:DataType = {"id":"number", "title":"string", "description":"string"};

function filterStringQuery(key: string, value: string): string {
  return (key + " LIKE '%" + value + "%' AND ");
}

type NumberRange = {
  UpperLimit: number;
  LowerLimit: number;
  LessThan: number;
  GreaterThan: number;
  EqualTo: number;
}

function filterNumberQuery(key: string, value: NumberRange) {
  if (value.UpperLimit != null && value.LowerLimit != null) {
    return (key + " BETWEEN " + value.LowerLimit + " AND " + value.UpperLimit + " AND ");
  } else if (value.LessThan != null) {
    return (key + " <= " + value.LessThan + " AND ");
  } else if (value.GreaterThan != null) {
    return (key + " >= " + value.GreaterThan + " AND ");
  } else if (value.EqualTo != null) {
    return (key + " = " + value.EqualTo + " AND ");
  }
}


// Define the type for Filters
type Filters = {
  [key: string]: any; // or more specific types if you know them
};

const sendSQL = async (params: string[], filters: Filters) => {

  const tableName = "tutorials ";
  let query: string = "SELECT ";

  try {
    if ((params).length) {
      console.log(params);
      for (const param of params) {
        query += param + ",";
      }
      query = query.replace(/.$/, " FROM " + tableName);
    }
    if (Object.keys(filters)) {
      query += " WHERE ";
      for (const key in filters) {
                  console.log(filters[key]);

        if (dataType[key] == "number") {
          query += filterNumberQuery(key, filters[key]);
        } else {
          query += filterStringQuery(key, filters[key]);
        }
      }
      query = query.replace(/WHERE $/, " ;");
      query = query.replace(/AND $/, " ;");
    } else {
      query += "* FROM " + tableName + " ;";
    }

    console.log("Generated Query = ", query);
    const [rows] = await pool.query(query);
    console.log([rows]);
    return rows;
  } catch (error){
    // console.error("Error executing SQL query:", error);
    throw new Error("The query is invalid, please check parameters.");
  }
  // for (let key in params) {
  //   console.log(key, params[key]);
  //   const [rows] = await pool.query(` SELECT * FROM tutorials WHERE title = ? `, params[key]);
  //   return [rows];
  // }
}

export default sendSQL;
