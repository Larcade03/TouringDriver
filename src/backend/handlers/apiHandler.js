// AWS Lambda Handler genérico / Router para Lambdas de Negocio detrás de Amazon API Gateway
// Permite que LambdaReservas, LambdaInstructor, LambdaProgreso, LambdaSimulacro,
// LambdaEstudiante y LambdaVehiculo ejecuten la lógica correspondiente.

const express = require("express");
const cors = require("cors");

function createLambdaApp(routerPath, routerModule) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(routerPath, routerModule);
  return app;
}

// Para usar con @codegenie/serverless-express o invocación HTTP
module.exports = { createLambdaApp };
