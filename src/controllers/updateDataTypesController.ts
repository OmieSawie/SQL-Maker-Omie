import updateDataTypesFromJson from "../lib/updateDataTypesFromJSON";

const updateDataTypesController = async (req:any, res:any) => {
  try {
    const body = req.body;
    body.initMessage = "Updating the data types... ";
    body.result = await updateDataTypesFromJson();
    body.endMessage = "...Updated the data types."
    console.log("Updated the data types", body.result);
    res.send(body);
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    res.status(500).send({ error: errorMessage });
    res.status(500).send(error);
  }
}

export default updateDataTypesController;
