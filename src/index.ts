import express from 'express';
import cors from 'cors'
import router from "./routers/router"

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    optionsSuccessStatus: 200,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// parse requests of content-type - application/json
app.use(express.json()); /* bodyParser.json() is deprecated */
app.use(express.urlencoded({ extended: true })); /* bodyParser.urlencoded() is deprecated */

app.use("/api/v1/",router);


app.listen(3000, () =>
  console.log('Example app listening on port 3000!'),
);
