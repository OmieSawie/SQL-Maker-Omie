import baseDataParsed from "../templateDatabases/tasks.json"


const queryName: string = "tasks";

try {
  // Check if the array has at least 3 elements and the third element is the tasks table
  if (Array.isArray(baseDataParsed) && baseDataParsed.length > 0) {
    let dataIdx = -1;
    for (let i = 0; i < baseDataParsed.length; i++) {
      if (baseDataParsed[i].type === 'table' && baseDataParsed[i].name === 'tasks') {
        dataIdx = i;
        break;
      }
    }
    if (dataIdx == -1) {
      throw new Error(`Unable to find ${queryName} name in the JSON`)
    }
    const tasksTable = baseDataParsed[2];

    // Check if the data property is an array and has at least one element
    if (Array.isArray(tasksTable.data) && tasksTable.data.length > 0) {
      const firstDataObject = tasksTable.data[0];
      console.log(firstDataObject);
    } else {
      console.log('No data found in the tasks table.');
    }
  } else {
    console.log('The expected table structure was not found.');
  }
} catch (error) {
  console.error('Error parsing JSON:', error);
}
