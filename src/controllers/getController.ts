import sendSQL from "../lib//makeCustomSQL";

const getController = async (req: any, res: any) => {
  try {
    const body = req.body;
    const params = req.body.query;
    const filters = req.body.filters;
    body.message = "hello, in the controller now ";
    body.params = params;
    body.result = await sendSQL(params, filters);
    res.send(body);
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    res.status(500).send({ error: errorMessage });
    res.status(500).send(error);
  }
}

export default getController;
