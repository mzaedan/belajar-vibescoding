import { createApp } from "./app";
import { config } from "./lib/config";

const app = createApp();

app.listen(config.appPort);

console.log(
  `api-template running at http://localhost:${config.appPort}${config.apiPrefix}`,
);
