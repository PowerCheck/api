import * as mongo from "./mongo";
import { CorsHeaders } from "./web";

const MONGO_COLLECTION_NAME:string = "plugins";

const List = (request:any, response:any, next:any):any => {
  try {

    let mongoQueryOptions:mongo.IMongoQueryOptions = {
      range: "0-9",
      query: {},
      options: {
        sort: { Version: -1 },
        skip: 0,
        limit: 10
      }
    };

    if (Object.keys(request.query).length !== 0) {
      mongoQueryOptions = {...mongoQueryOptions, ...mongo.FilterSettings(request.query)};
      if (mongoQueryOptions.query.hasOwnProperty("q")) {
        const filterText = mongoQueryOptions.query.q;
        const reg = new RegExp(`.*${filterText}.*`, "gi");

        mongoQueryOptions.query = {
          $or: [
            { Plugin: { $regex: reg } },
            { Version: { $regex: reg } }
          ]
        };
      }
    }

    // Not the most elegant way, but we need to change "Date" into the deep field "LastReport"
    // By default sort Date(LastReport) descending
    if (mongoQueryOptions.options?.hasOwnProperty("sort")) {
      if (mongoQueryOptions.options.sort.hasOwnProperty("Date")) {
        mongoQueryOptions.options.sort = {"LastReport": -1}
      }
    }

    mongo.GetDocumentArray(mongoQueryOptions.query, "viewPlugins", mongoQueryOptions.options, (result:any) => {
      let numberOfDocuments:number = result.numberOfDocuments;
      let jsdata:any[] = [];

      result.documents.forEach( (document:any) => {
        jsdata.push(mongo.FromMongoId(document));
      });

      response = CorsHeaders(request, response);
      response.setHeader('Access-Control-Expose-Headers', 'Content-Range');
      response.setHeader('Content-Range', `reports ${mongoQueryOptions.range}}/${numberOfDocuments}`);
      response.send(jsdata);
      
    });
  } catch (e) {
    console.log(e);
    next(e);
  }
}

const Show = (request:any, response:any, next:any):any => {
  try {
    let mongoQueryOptions:mongo.IMongoQueryOptions = mongo.FilterSettings(request.params);
    mongoQueryOptions.query = { _id: request.params.id };

    mongo.GetDocumentArray(mongoQueryOptions.query, MONGO_COLLECTION_NAME, mongoQueryOptions.options, (result:any) => {
      let data:any = null;

      result.documents.forEach( (document:any) => {
        data = mongo.FromMongoId(document);
      });

      response = CorsHeaders(request, response);
      response.send(data);
    });

  } catch (e) {
    console.log(e);
    next(e);
  }
}

const Options = (request:any, response:any, next:any) => {
  response = CorsHeaders(request, response);
  response.send();
}

export {
  List,
  Show,
  Options
}