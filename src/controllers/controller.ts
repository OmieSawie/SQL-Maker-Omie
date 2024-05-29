import sendSQL from "../makeCustomSQL";

const controller = async(req:any,res:any) => {
  try {
    const body = req.body;
    const params = req.query;
    body.message = "hello, in the controller now ";
    body.params = params;
     sendSQL(params);
    res.send(body);
  } catch (err) {
    res.status(500).send("Error in the controller");
  }
}

export default controller;
