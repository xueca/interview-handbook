#!/usr/bin/env node
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

const server = new Server(
  { name: "echo-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// 注册工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "echo",
        description: "回显你输入的消息",
        inputSchema: {
          type: "object",
          properties: {
            msg: { type: "string", description: "要回显的消息" }
          },
          required: ["msg"]
        }
      }
    ]
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "echo") {
    const msg = request.params.arguments?.msg || "";
    return {
      content: [{ type: "text", text: msg }]
    };
  }
  throw new Error("Unknown tool");
});

// 启动 stdio 传输
const transport = new StdioServerTransport();
server.connect(transport);
