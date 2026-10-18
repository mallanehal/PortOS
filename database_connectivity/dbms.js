require("dotenv").config();
const mysql=require("mysql2")
const db=mysql.createPool({
host:process.env.db_host,
user:process.env.db_user,
password:process.env.db_password,
database:process.env.db_name});
db.getConnection((err, connection) => 
{
    if(err) {
        console.log("Databse connection failed:", err.message);
        return;
    }
    console.log("MySQL database connected successfully!");
    connection.release();
});
module.exports=db;
