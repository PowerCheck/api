import { pipeline } from "stream";

const { MongoClient, ObjectId } = require("mongodb");

const default_insert_options = { "ordered": true };
const default_get_options = { "sort": { "_id": -1 } };
const default_update_options = {};
const default_delete_options = {};

var mongoDbClient:any = null;
var mongoDbDatabase:any = null;

var mongoConnectionUri:string = process.env.MONGODB_CONNECTION_STRING ?? "mongodb://localhost?retryWrites=true&w=majority";;
var mongoDatabaseName:string =  process.env.MONGODB_DATABASE_NAME ?? "powercheck";

var isConnected:boolean = false;

interface IDocumentsCallback {
  (documents:object):void,
  (numberOfDocuments:number):void
};

interface IMongoQueryOptions {
  range?: string;
  query: any;
  options?: IMongoOptions;
}

interface IMongoOptions {
  sort: any;
  projection?: object;
  skip: number;
  limit: number;
}

interface IAggregateSettings {
  range: string,
  aggregation: any[]
}

const Connect = async (connection:any, databaseName:string)=> {
  switch (typeof(connection)) {
    case "string":
      mongoConnectionUri = connection;
      break;
    case "object":
      mongoDbClient = connection;
      break;
    default:
      throw "Invalid connection";
  }
  mongoDatabaseName = databaseName;
}

const ConnectDatabase = async () => {
  try {
    if (!isConnected) {
      if (mongoDbClient == null) {
        mongoDbClient = new MongoClient(mongoConnectionUri);
        await mongoDbClient.connect();
      }
      mongoDbDatabase = mongoDbClient.db(mongoDatabaseName);
    }
  } catch (e) {
    console.log(e);
  } finally {
    isConnected = true;
  }
}

const GetDocumentArray = async (query:any, collectionName:string, options:any, callback:IDocumentsCallback) => {
  let result:any;
  let numberOfDocuments:number = 0;

  try {
    if (options == null) { options = {}; }

    // Convert ID text string to MongonDb ID object
    if (query.hasOwnProperty("_id")) {
      query._id = ToMonogoId(query._id);
    } 

    await ConnectDatabase();
    const collection = mongoDbDatabase.collection(collectionName);

    numberOfDocuments = await collection.countDocuments(query);
    const cursor = collection.find(query, options);

    result = await cursor.toArray();

  } catch (e) {
    console.log(e);
  } finally {
    callback({
      documents: result,
      numberOfDocuments: numberOfDocuments
    });
  }
}

const AggregateDocuments = async(pipeline:any, collectionName:any, callback:IDocumentsCallback) => {
  let result:any;
  let numberOfDocuments:number = 0;

  try {
    await ConnectDatabase();
    const collection = mongoDbDatabase.collection(collectionName);
    const cursor = collection.aggregate(pipeline);

    result = await cursor.toArray();
    numberOfDocuments = result.length;

  } catch (e) {
    console.log(e);
  } finally {
    callback({
      documents: result,
      numberOfDocuments: numberOfDocuments
    });
  }
}

const UpsertDocument = async (query:any, document:any, collectionName:any, callback:any) => {
  let result = null;
  try {
    let options = { upsert: true }

    if (query.hasOwnProperty("_id")) {
      query._id = ToMonogoId(query._id);
      delete document._id;
    }

    await ConnectDatabase();

    const collection = mongoDbDatabase.collection(collectionName);

    result = await collection.updateOne(query, document, options);

  } catch (e) {
    console.log(e);
  } finally {
    callback(result);
  }
}

const FilterSettings = (httpQuery:any, options:any = {}):IMongoQueryOptions => {
  let query:object = {};
  let range:any[] = [];
  let from:number = 0;
  let to:number = 0;
  let itemsPerPage:number = 0;

  if (httpQuery.hasOwnProperty("filter")) {
    query = JSON.parse(httpQuery["filter"]);
  }

  // Page number to retreive the items from
  if (httpQuery.hasOwnProperty("range")) {
    range = JSON.parse(httpQuery['range']);
    from = parseInt(range[0]);
    to = parseInt(range[1]);
    itemsPerPage = to - from;

    // Don't like mixing json and array, but it works
    options["skip"] = from;
    options["limit"] = itemsPerPage + 1;
  }

  // Sorting
  if (httpQuery.hasOwnProperty("sort")) {
    let sort:any[] = JSON.parse(httpQuery["sort"]);
    let field:any[] = sort[0];
    let order:number = (sort[1].toLowerCase() == "asc" ? 1 : -1);

    const sortObject = JSON.parse(`{ "${field}": ${order} }`);
    options["sort"] = sortObject;
  }

  return {
    "range": `${from}-${to}`,
    "query": query,
    "options": options,
  }
}

const AggregateSettings = (httpQuery:any):IAggregateSettings => {
  let range:any[] = [];
  let from:number = 0;
  let to:number = 0;
  let itemsPerPage:number = 0;
  
  let aggregation:any = [];

  // Page number to retreive the items from
  if (httpQuery.hasOwnProperty("range")) {
    range = JSON.parse(httpQuery['range']);
    from = parseInt(range[0]);
    to = parseInt(range[1]);
    itemsPerPage = to - from;

    aggregation.push({$skip: from});
    aggregation.push({$limit: itemsPerPage+1});
  }

  // Sorting
  if (httpQuery.hasOwnProperty("sort")) {
    let sort:any[] = JSON.parse(httpQuery["sort"]);
    let field:any[] = sort[0];
    let order:number = (sort[1].toLowerCase() == "asc" ? 1 : -1);
  
    const sortObject = JSON.parse(`{ "${field}": ${order} }`);
    aggregation.push({$sort: sortObject});
  }

  return {
    "range": `${from}-${to}`,
    "aggregation": aggregation
  }
}

const NewMongoId = ():any => {
  return new ObjectId();
}

const ToMonogoId = (id:string|[]):string|boolean => {
  let mongoObjectId:any;
  try {
    switch (typeof id) {
      case "object":
        mongoObjectId = id;
        // Convert MongoDB object ID strings to an ObjectId
        Object.keys(mongoObjectId).map( (key:any) => {
          let elements:number = mongoObjectId[key].length;
          mongoObjectId[key].map((i:string) => {
            mongoObjectId[key].push(new ObjectId(i));
          });
          mongoObjectId[key].splice(0, elements);
        });
        break;
      default:
        mongoObjectId = new ObjectId(id);
        break;
    }
  } catch (e) {
    console.log(e);
    return false;
  } finally {
    return mongoObjectId;
  }
}

const FromMongoId = (mongoId:any):any => {
  mongoId.id = mongoId._id;

  delete mongoId['_id'];
  return mongoId;
}

export {
  IAggregateSettings,
  IMongoQueryOptions,

  Connect,

  GetDocumentArray,
  AggregateDocuments,

  UpsertDocument,

  FilterSettings,

  NewMongoId,
  ToMonogoId,
  FromMongoId,

  AggregateSettings,


};
