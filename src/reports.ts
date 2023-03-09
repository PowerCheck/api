import { fstat, readFileSync, writeFileSync, unlinkSync } from "fs";
import { ObjectId } from "mongodb";

import * as mongo from "./mongo";
import { CorsHeaders } from "./web";

interface IReport {
  Data: any[],
  Version: string,
  Runtime: IReportRuntime,
  Title: string,
  ScriptList: any[],
  Plugin: string
}
interface IReportRuntime {
  Start: number,
  Finish: number
}

interface IScript {
  Name: string,
  Author: string,
  Version: string,
  Category: string,
  ids: any[]
}

const Create = (request:any, response:any, next:any) => {
  try {
    let mongoId:ObjectId = new ObjectId();

    const filename:string = request.file.path;
    const content:string = readFileSync(filename, {encoding: "utf8"} ).toString() ?? "";

    unlinkSync(filename);

    const document:IReport = JSON.parse(
      content.replace(/^\uFEFF/gm, "").replace(/^\u00EF?\u00BB\u00BF/gm,"")
    );

    const reportsQueryParam:object = {
      Plugin: document.Plugin,
      Version: document.Version,
      "Runtime.Start": document.Runtime.Start
    }

    // Insert report
    mongo.UpsertDocument(reportsQueryParam, {$set: document}, "reports", (result:any) => {
      mongoId = result.upsertedId;
      const pluginsQueryParams:object = {
        Plugin: document.Plugin,
        Version: document.Version
      }

      const pluginsAggregation:any = {
        $set: {
          LastReport: document.Runtime.Start,
        },
        $push: { ids: mongoId}
      }

      if ( null !== mongoId) {
        // Insert or update plugins table
        mongo.UpsertDocument(pluginsQueryParams, pluginsAggregation, "plugins", (result:any) => {});

        // Loop through each script
        document.Data.map( (script:IScript) => {
          let scritpsQueryParams:object = {};
          let scriptsAggregation:object = {};

          scritpsQueryParams = {
            Name: script.Name,
            Version: script.Version
          }
          scriptsAggregation = {
            $set: {
              Author: script.Author,
              Category: script.Category,
            },
            $push: { ids: mongoId }
          };

          // Insert or update scripts table
          mongo.UpsertDocument(scritpsQueryParams, scriptsAggregation, "scripts", (result:any) => {} );
        });
      }
    });

    response = CorsHeaders(request, response);
    response.send({
      data: { id: mongoId }
    });
  } catch (e) {
    console.log(e);
    next(e);
  }
}

const List = (request:any, response:any, next:any):any => {
  try {

    let mongoQueryOptions:mongo.IMongoQueryOptions = {
      range: "0-9",
      query: {},
      options: {
        sort: { "Runtime.Start": -1 },
        projection:{_id:1, Title:1, Version:1, Plugin:1, "Runtime.Start":1},
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
            { Title: { $regex: reg } },
            { Plugin: { $regex: reg } },
            { Version: { $regex: reg } }
          ]
        };
      }
    }

    // Not the most elegant way, but we need to change "Date" into the deep field "Runtime.Start"
    // By default sort Date(Runtime.Start) descending
    if (mongoQueryOptions.options?.hasOwnProperty("sort")) {
      if (mongoQueryOptions.options.sort.hasOwnProperty("Date")) {
        mongoQueryOptions.options.sort = {"Runtime.Start": -1}
      }
    }

    mongo.GetDocumentArray(mongoQueryOptions.query, "reports", mongoQueryOptions.options, (result:any) => {
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

    mongo.GetDocumentArray(mongoQueryOptions.query, "reports", mongoQueryOptions.options, (result:any) => {
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
  Create,
  List,
  Show,
  Options
}