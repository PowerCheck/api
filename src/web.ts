const WEB_HOSTNAME:string = process.env.WEB_HOSTNAME ?? "localhost";
const WEB_HTTP_PROTOCOL:string = process.env.WEB_HTTP_PROTOCOL ?? "http";
const WEB_HTTP_PORT:number = parseInt(process.env.WEB_HTTP_PORT ?? "80");

const GetOriginHost = ():string => {
  let proto:string = WEB_HTTP_PROTOCOL;
  let host:string = WEB_HOSTNAME;
  let port:number = WEB_HTTP_PORT;

  if ( ! [80, 443].includes(port) ) {
    return `${proto}://${host}:${port}`;
  }

  return `${proto}://${host}`;
};

const CorsHeaders = (request:any, response:any) => {

  let requestHeadersOrigin:string = request.headers.origin;
  if (typeof requestHeadersOrigin === "undefined") {
    requestHeadersOrigin = GetOriginHost();
  }

  switch (request.headers['access-control-request-method']) {
    case "GET":
      response.setHeader('Access-Control-Allow-Origin', requestHeadersOrigin);
      response.setHeader('Access-Control-Allow-Methods', 'GET');
      response.setHeader('Access-Control-Allow-Headers', 'range');
      break;
    case "POST":
      response.setHeader('Access-Control-Allow-Origin', requestHeadersOrigin);
      response.setHeader('Access-Control-Allow-Methods', 'POST');
      response.setHeader('Access-Control-Allow-Headers', 'content-type');
      break;
    case "PUT":
      response.setHeader('Access-Control-Allow-Origin', requestHeadersOrigin);
      response.setHeader('Access-Control-Allow-Methods', 'PUT');
      response.setHeader('Access-Control-Allow-Headers', 'content-type');
      break;
    case "DELETE":
      response.setHeader('Access-Control-Allow-Origin', requestHeadersOrigin);
      response.setHeader('Access-Control-Allow-Methods', 'DELETE');
      break;
    default:
      response.setHeader('Access-Control-Allow-Origin', requestHeadersOrigin);
      break;
  }
  return response;
}

export {
  CorsHeaders
}