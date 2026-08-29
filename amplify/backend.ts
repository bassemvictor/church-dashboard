import { defineBackend } from "@aws-amplify/backend";
import { Stack } from "aws-cdk-lib";
import { CorsHttpMethod, HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";

import { auth } from "./auth/resource.js";
import { shepherdHubApi } from "./functions/shepherd-hub-api/resource.js";
import { storage } from "./storage/resource.js";

const backend = defineBackend({
  auth,
  shepherdHubApi,
  storage,
});

const apiStack = backend.createStack("church-dashboard-api");
const dataStack = backend.createStack("church-dashboard-data");

const tableName = process.env.SHEPHERD_HUB_RECORDS_TABLE?.trim();

const recordsTable = new Table(dataStack, "ChurchDashboardTable", {
  ...(tableName ? { tableName } : {}),
  billingMode: BillingMode.PAY_PER_REQUEST,
  partitionKey: {
    name: "PK",
    type: AttributeType.STRING,
  },
  sortKey: {
    name: "SK",
    type: AttributeType.STRING,
  },
});

recordsTable.addGlobalSecondaryIndex({
  indexName: "GSI1",
  partitionKey: {
    name: "GSI1PK",
    type: AttributeType.STRING,
  },
  sortKey: {
    name: "GSI1SK",
    type: AttributeType.STRING,
  },
});

recordsTable.addGlobalSecondaryIndex({
  indexName: "GSI2",
  partitionKey: {
    name: "GSI2PK",
    type: AttributeType.STRING,
  },
  sortKey: {
    name: "GSI2SK",
    type: AttributeType.STRING,
  },
});

recordsTable.grantReadWriteData(backend.shepherdHubApi.resources.lambda);
backend.shepherdHubApi.addEnvironment("SHEPHERD_HUB_RECORDS_TABLE", recordsTable.tableName);

const httpApi = new HttpApi(apiStack, "ChurchDashboardHttpApi", {
  apiName: "churchDashboardApi",
  corsPreflight: {
    allowOrigins: ["*"],
    allowHeaders: ["content-type", "authorization"],
    allowMethods: [
      CorsHttpMethod.GET,
      CorsHttpMethod.POST,
      CorsHttpMethod.PUT,
      CorsHttpMethod.DELETE,
      CorsHttpMethod.OPTIONS,
    ],
  },
  createDefaultStage: true,
});

const integration = new HttpLambdaIntegration("ChurchDashboardApiIntegration", backend.shepherdHubApi.resources.lambda, {
  scopePermissionToRoute: false,
});

const authorizer = new HttpUserPoolAuthorizer("ChurchDashboardAuthorizer", backend.auth.resources.userPool, {
  userPoolClients: [backend.auth.resources.userPoolClient],
});

const addProtectedRoutes = (path: string, methods: HttpMethod[]) =>
  httpApi.addRoutes({
    path,
    methods,
    integration,
    authorizer,
  });

httpApi.addRoutes({
  path: "/expenses",
  methods: [HttpMethod.GET],
  integration,
});

httpApi.addRoutes({
  path: "/news",
  methods: [HttpMethod.GET],
  integration,
});

httpApi.addRoutes({
  path: "/dashboard",
  methods: [HttpMethod.GET],
  integration,
});

httpApi.addRoutes({
  path: "/settings",
  methods: [HttpMethod.GET],
  integration,
});

addProtectedRoutes("/admin/expenses", [HttpMethod.GET]);
addProtectedRoutes("/admin/news", [HttpMethod.GET]);
addProtectedRoutes("/expenses", [HttpMethod.POST]);
addProtectedRoutes("/expenses/order", [HttpMethod.PUT]);
addProtectedRoutes("/expenses/{id}/approve", [HttpMethod.PUT]);
addProtectedRoutes("/expenses/{id}", [HttpMethod.GET, HttpMethod.PUT, HttpMethod.DELETE]);
addProtectedRoutes("/news", [HttpMethod.POST]);
addProtectedRoutes("/news/order", [HttpMethod.PUT]);
addProtectedRoutes("/news/{id}/approve", [HttpMethod.PUT]);
addProtectedRoutes("/news/{id}", [HttpMethod.GET, HttpMethod.PUT, HttpMethod.DELETE]);
addProtectedRoutes("/admin/settings", [HttpMethod.PUT]);

backend.addOutput({
  custom: {
    API: {
      shepherdHubApi: {
        apiName: httpApi.httpApiName,
        endpoint: httpApi.url,
        region: Stack.of(httpApi).region,
      },
    },
    storage: {
      recordsTable: {
        region: Stack.of(recordsTable).region,
        tableName: recordsTable.tableName,
      },
    },
  },
});
