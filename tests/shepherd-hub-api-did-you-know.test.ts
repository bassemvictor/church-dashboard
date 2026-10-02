import assert from "node:assert/strict";
import test from "node:test";

import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

process.env.SHEPHERD_HUB_RECORDS_TABLE = "test-records";

const records = new Map<string, Record<string, unknown>>();
const recordKey = (key: { PK: string; SK: string }) => `${key.PK}|${key.SK}`;

const originalSend = DynamoDBDocumentClient.prototype.send;
DynamoDBDocumentClient.prototype.send = async function (command: { constructor: { name: string }; input: Record<string, any> }) {
  const { input } = command;

  if (command.constructor.name === "PutCommand") {
    records.set(recordKey(input.Item), input.Item);
    return {};
  }
  if (command.constructor.name === "GetCommand") {
    return { Item: records.get(recordKey(input.Key)) };
  }
  if (command.constructor.name === "DeleteCommand") {
    records.delete(recordKey(input.Key));
    return {};
  }
  if (command.constructor.name === "QueryCommand") {
    const keyName = input.IndexName === "GSI2" ? "GSI2PK" : "GSI1PK";
    return { Items: [...records.values()].filter((item) => item[keyName] === input.ExpressionAttributeValues[":pk"]) };
  }
  if (command.constructor.name === "BatchGetCommand") {
    const keys = input.RequestItems["test-records"].Keys as Array<{ PK: string; SK: string }>;
    return { Responses: { "test-records": keys.flatMap((key) => {
      const item = records.get(recordKey(key));
      return item ? [item] : [];
    }) } };
  }
  if (command.constructor.name === "TransactWriteCommand") {
    for (const transaction of input.TransactItems) {
      const update = transaction.Update;
      const item = records.get(recordKey(update.Key));
      if (item) {
        const values = update.ExpressionAttributeValues;
        Object.assign(item, {
          displayOrder: values[":displayOrder"],
          updatedAt: values[":updatedAt"],
          GSI1SK: values[":gsi1sk"],
          GSI2SK: values[":gsi2sk"],
        });
      }
    }
    return {};
  }
  throw new Error(`Unexpected DynamoDB command: ${command.constructor.name}`);
};

const { handler } = await import("../amplify/functions/shepherd-hub-api/handler.js");

const request = async (method: string, path: string, body?: unknown, admin = true) => {
  const response = await handler({
    rawPath: path,
    body: body === undefined ? undefined : JSON.stringify(body),
    requestContext: {
      http: { method },
      authorizer: { jwt: { claims: admin ? { "cognito:groups": "admin" } : {} } },
    },
  } as any, {} as any, {} as any);
  const apiResponse = response as { statusCode: number; body: string };
  return { statusCode: apiResponse.statusCode, body: JSON.parse(apiResponse.body) };
};

test.after(() => {
  DynamoDBDocumentClient.prototype.send = originalSend;
});

test("Did You Know CRUD, ordering, active state, and admin protection", { concurrency: false }, async () => {
  records.clear();
  const first = await request("POST", "/did-you-know", { factText: "Monthly expenses are about", highlightText: "$100,000?", supportingText: "Your support keeps ministry moving.", active: true });
  assert.equal(first.statusCode, 201);
  assert.equal(first.body.displayOrder, 1);
  assert.equal(first.body.supportingText, "Your support keeps ministry moving.");
  const second = await request("POST", "/did-you-know", { factText: "Agape meal costs about", active: true });
  assert.equal(second.body.highlightText, undefined);

  const listed = await request("GET", "/admin/did-you-know");
  assert.deepEqual(listed.body.items.map((item: { id: string }) => item.id), [first.body.id, second.body.id]);
  assert.equal((await request("GET", `/did-you-know/${first.body.id}`)).body.factText, "Monthly expenses are about");
  assert.equal((await request("GET", "/admin/did-you-know", undefined, false)).statusCode, 403);

  const updated = await request("PUT", `/did-you-know/${first.body.id}`, {
    factText: "Updated fact",
    icon: "church",
    active: true,
  });
  assert.equal(updated.body.factText, "Updated fact");
  assert.equal(updated.body.displayOrder, 1);

  const reordered = await request("PUT", "/did-you-know/order", {
    items: [{ id: first.body.id, displayOrder: 2 }, { id: second.body.id, displayOrder: 1 }],
  });
  assert.deepEqual(reordered.body.items.map((item: { id: string }) => item.id), [second.body.id, first.body.id]);

  const inactive = await request("PUT", `/did-you-know/${second.body.id}/active`, { active: false });
  assert.equal(inactive.body.item.active, false);
  const publicList = await request("GET", "/did-you-know");
  assert.deepEqual(publicList.body.items.map((item: { id: string }) => item.id), [first.body.id]);

  assert.equal((await request("DELETE", `/did-you-know/${first.body.id}`)).statusCode, 200);
  assert.equal((await request("GET", `/did-you-know/${first.body.id}`)).statusCode, 404);
});

test("Did You Know visibility windows are applied to public list and dashboard", { concurrency: false }, async () => {
  records.clear();
  await request("POST", "/did-you-know", { factText: "Future", visibleFrom: "2999-01-01", active: true });
  const expired = await request("POST", "/did-you-know", { factText: "Expired", visibleUntil: "2000-01-01", active: true });
  const visible = await request("POST", "/did-you-know", { factText: "Visible", active: true });

  assert.deepEqual((await request("GET", "/did-you-know")).body.items.map((item: { id: string }) => item.id), [visible.body.id]);
  const dashboard = await request("GET", "/dashboard");
  assert.deepEqual(dashboard.body.didYouKnow.map((item: { id: string }) => item.id), [visible.body.id]);
  assert.equal(expired.statusCode, 201);
});

test("legacy stored settings receive Did You Know defaults", { concurrency: false }, async () => {
  records.clear();
  records.set("SETTINGS#DASHBOARD|SETTINGS", {
    PK: "SETTINGS#DASHBOARD",
    SK: "SETTINGS",
    entityType: "DashboardSettings",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    settings: {
      common: { churchName: "Legacy", showClock: true, showDate: true, showExpensesPage: true, showNewsPage: true, refreshIntervalSeconds: 300, mainViewRotationIntervalSeconds: 30 },
      expenses: { dashboardTitle: "Expenses", itemsPerPage: 4 },
      news: { dashboardTitle: "News", itemsPerPage: 4 },
      liturgy: { lookAheadWeeks: 3, upcomingLiturgiesCount: 3 },
    },
  });
  const response = await request("GET", "/settings");
  assert.equal(response.body.settings.common.showDidYouKnowPage, true);
  assert.deepEqual(response.body.settings.didYouKnow, { dashboardTitle: "DID YOU KNOW?", itemsPerPage: 4 });
});

test("expense display flags default, persist, and preserve legacy visibility", { concurrency: false }, async () => {
  records.clear();
  const baseExpense = {
    title: "Roof repair",
    category: "PROJECT",
    totalBudget: 100000,
    fundedAmount: 25000,
    active: true,
    statusMode: "AUTO",
  };
  const defaults = await request("POST", "/expenses", baseExpense);
  assert.deepEqual(
    [defaults.body.showFunded, defaults.body.showProgress, defaults.body.showStatus],
    [false, false, false],
  );

  const allHidden = await request("PUT", `/expenses/${defaults.body.id}`, {
    ...baseExpense,
    showFunded: false,
    showProgress: false,
    showStatus: false,
  });
  assert.deepEqual(
    [allHidden.body.showFunded, allHidden.body.showProgress, allHidden.body.showStatus],
    [false, false, false],
  );
  assert.equal(allHidden.body.fundedAmount, 25000);
  assert.equal(allHidden.body.statusMode, "AUTO");

  const allVisible = await request("POST", "/expenses", {
    ...baseExpense,
    showFunded: true,
    showProgress: true,
    showStatus: true,
  });
  assert.deepEqual(
    [allVisible.body.showFunded, allVisible.body.showProgress, allVisible.body.showStatus],
    [true, true, true],
  );

  for (const flag of ["showFunded", "showProgress", "showStatus"] as const) {
    const created = await request("POST", "/expenses", {
      ...baseExpense,
      showFunded: true,
      showProgress: true,
      showStatus: true,
      [flag]: false,
    });
    assert.equal(created.body[flag], false);
    for (const otherFlag of ["showFunded", "showProgress", "showStatus"] as const) {
      if (otherFlag !== flag) assert.equal(created.body[otherFlag], true);
    }
  }

  records.set("EXPENSE#legacy|EXPENSE", {
    PK: "EXPENSE#legacy",
    SK: "EXPENSE",
    entityType: "Expense",
    GSI1PK: "EXPENSE",
    GSI1SK: "99999#legacy",
    GSI2PK: "EXPENSE#ACTIVE",
    GSI2SK: "99999#legacy",
    id: "legacy",
    ...baseExpense,
    displayOrder: 99999,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  const listed = await request("GET", "/expenses");
  const legacy = listed.body.items.find((item: { id: string }) => item.id === "legacy");
  assert.deepEqual([legacy.showFunded, legacy.showProgress, legacy.showStatus], [true, true, true]);
});
