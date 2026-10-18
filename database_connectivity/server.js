const express=require("express");
const db=require("./dbms");
const app=express();
app.use(express.json());
app.get("/", (req,res)=>{
    res.send("PortOS backened running");});
app.get("/Ships", (req, res)=>{
    const sql="select * from ship";
    db.query(sql, (err, results)=> {
        if(err){
            console.erro(err.message);
            return res.status(500).json({
                error: "Could not fetch ship"
            });
        }
        res.json(results);
    });
});
app.listen(3000, ()=>{
    console.log("Server running at http://localhost:3000");
});