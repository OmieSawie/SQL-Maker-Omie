import baseDataParsed from "../../templateDatabases/tasks.json"
import fs from 'fs'
import path from 'path'

const queryName: string = "tasks";
// const dataProperties: string[] = [];

function extractDataFromTable(data: Array<Record<string, any>>): { [key: string]: string } {

  let result: { [key: string]: string } = {};

  for (const dataObject of data) {
    let isIncomplete: boolean = false;
    // console.log("Type of data ", Object.keys(dataObject));
    for (const key in dataObject) {
      if (dataObject[key] === null) {
        result[key] = "unknown";
      } else if (!isNaN(Number(dataObject[key]))) {
        result[key] = "number";
      }
      else {
        result[key] = "string";
      }
      if (result[key] === "unknown") {
        isIncomplete = true;
      }
      // console.log(result[key], dataObject[key]);
    }
    if (isIncomplete === false) {
      break;
    }
  }
  // console.log(result);


  return result;
}

async function updateDataTypesFromJson() {
  try {
    // Check if the array has at least 3 elements and the third element is the tasks table
    if (Array.isArray(baseDataParsed) && baseDataParsed.length > 0) {
      let dataIdx = -1;
      for (let i = 0; i < baseDataParsed.length; i++) {
        if (baseDataParsed[i].type === 'table' && baseDataParsed[i].name === queryName) {
          dataIdx = i;
          break;
        }
      }
      if (dataIdx == -1) {
        throw new Error(`Unable to find <${queryName}> name in the JSON`)
      }
      const dataTable = baseDataParsed[dataIdx];
      const data = dataTable.data;

      // Check if the data property is an array and has at least one element
      if (Array.isArray(data) && data.length > 0) {

        const dataProperties: { [key: string]: string } = extractDataFromTable(data);

        const jsonString = JSON.stringify(dataProperties, null, 2);
        console.log(jsonString);

        const filePath = path.resolve(__dirname,"../datatypesConf.json");

        fs.writeFile(filePath, jsonString, (error: any) => {
          if (error) {
            console.log("error in writind file", error);
            return;
          }
          console.log("JSON File written to ", filePath);
        })

        return dataProperties;

      } else {
        console.log(`No data found in the ${queryName} table.`);
      }
    } else {
      console.log(`The expected table structure with name ${queryName} was not found.`);
    }
  } catch (error) {
    console.error('Error parsing JSON:', error);
  }
}

export default updateDataTypesFromJson;
