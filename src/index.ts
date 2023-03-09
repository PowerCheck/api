import * as dotenv from "dotenv";
import * as dotenvExpand from "dotenv-expand";
import express, { Application, Request, Response } from "express";
import session from "express-session";
import multer, { MulterError } from "multer";

// Load and expand .env variables
var env = dotenv.config();
dotenvExpand.expand(env);

const reports = require("./reports");
const plugins = require("./plugins");
const scripts = require("./scripts");

// https://auth0.com/blog/node-js-and-typescript-tutorial-build-a-crud-api/
// https://github.com/revrenlove/node-boilerplate

const API_HTTP_PORT:number = parseInt(process.env.API_HTTP_PORT ?? "8081");
const API_SESSION_SECRET:string = process.env.API_HTTP_SESSION_SECRET ?? btoa(Math.random().toString());

const API_URL_BASE:string = "/api";
const API_URL_REPORT:string = `${API_URL_BASE}/reports`;
const API_URL_PLUGINS:string = `${API_URL_BASE}/plugins`;
const API_URL_SCRIPTS:string = `${API_URL_BASE}/scripts`;

const app:Application = express();
const upload:multer.Multer = multer({ dest: '/tmp/uploads' });

// Configure application server
app.use(session({ secret: API_SESSION_SECRET, saveUninitialized: true, resave: true }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.post(`${API_URL_REPORT}`, upload.single("file"), reports.Create);
app.get(`${API_URL_REPORT}`, reports.List);
app.get(`${API_URL_REPORT}/:id`, reports.Show);
app.options(`${API_URL_REPORT}/*`, reports.Options);

app.get(`${API_URL_PLUGINS}`, plugins.List);
app.get(`${API_URL_PLUGINS}/:id`, plugins.Show);
app.options(`${API_URL_PLUGINS}/*`, plugins.Options);

app.get(`${API_URL_SCRIPTS}`, scripts.List);
app.get(`${API_URL_SCRIPTS}/:id`, scripts.Show);
app.options(`${API_URL_SCRIPTS}/*`, scripts.Options);

app.options("*", (request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Method', 'GET');
  response.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Origin, range');
  response.setHeader('Access-Control-Expose-Headers', 'Content-Range');

  response.setHeader('Access-Control-Expose-Headers', 'range');
  response.send();
})

app.listen(API_HTTP_PORT, ():void => {
  console.log(`Listening on port ${API_HTTP_PORT}`);
});