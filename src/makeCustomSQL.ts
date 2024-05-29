import mysql from "mysql2"

const pool = mysql.createPool({
  host: 'process.env.HOST',
  user: 'process.env.',
  password: 'root',
  database: 'restSQL'
}).promise();

const sendSQL = async (params: Object) => {

  const result = await pool.query('SELECT * FROM tutorials WHERE id = 2 ');
  // console.log(result[0]);
}

export default sendSQL;
