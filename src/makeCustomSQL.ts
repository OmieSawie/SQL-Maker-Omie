import mysql from "mysql2"
import * as dotenv from "dotenv";

dotenv.config({ path: __dirname + '/.env' });

const pool = mysql.createPool({
  host: process.env.HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_USER_PASSWORD,
  database: process.env.DATABASE,
}).promise();

console.log(process.env.DATABASE);

// Define the type for params
type Params = {
  [key: string]: any; // or more specific types if you know them
};

const sendSQL = async (params: Params) => {
  for (let key in params) {
    console.log(key, params[key]);
    const result = await pool.query(` SELECT * FROM tutorials WHERE title = ? `,  params[key]);
    console.log(result);
  }
}

export default sendSQL;
