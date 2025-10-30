import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { OrderNumberSchema, OrderNumberListSchema, ProductSchema } from "./schemas.js";

const api_base_url = "https://ca-odpr-eus-gt-wismo-dev.agreeableriver-391c9765.eastus.azurecontainerapps.io/";

const server = new McpServer({
  name: "mcp-streamable-http",
  version: "1.0.0",
});

// Get order information tool  
const getOrderInfo = server.tool(
  "get-order-info",
  "Get detailed order information by order number",
  {
    orderNumber: z.string().describe("The order number to look up"),
  },
  async (params: { orderNumber: string }) => {
    try {
      const response = await fetch(
        `${api_base_url}/order_detail/${params.orderNumber}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            content: [
              {
                type: "text",
                text: `Order ${params.orderNumber} not found.`,
              },
            ],
            isError: true,
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Error fetching order ${params.orderNumber}: ${response.status} ${response.statusText}`,
              },
            ],
            isError: true,
          };
        }
      }
      
      const data = await response.json();
      
      // Ensure data is an array for structured content
      const orderList = Array.isArray(data) ? data : [data];
      
      return {
        content: [],
        structuredContent: orderList,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch order information: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);

const getOrderOverview = server.tool(
  "get-order-overview",
  "Get order overview information by order number",
  {
    orderNumber: z.string().describe("The order number to look up"),
  },
  async (params: { orderNumber: string }) => {
    try {
      const response = await fetch(
        `${api_base_url}/order_overview/${params.orderNumber}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            content: [
              {
                type: "text",
                text: `Order overview for ${params.orderNumber} not found.`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Error fetching order overview ${params.orderNumber}: ${response.status} ${response.statusText}`,
              },
            ],
          };
        }
      }
      
      const data = await response.json();

      // ensure data is an array for structured content
      const overviewList = Array.isArray(data) ? data : [data];
      
      return {
        content: [],
        structuredContent: overviewList,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch order overview: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);

// Get order email tool
const getOrderEmail = server.tool(
  "get-order-email",  
  "Get order information formatted as an email by order number",
  {
    orderNumber: z.string().describe("The order number to look up"),
  },
  async (params: { orderNumber: string }) => {
    try {
      const response = await fetch(
        `${api_base_url}/email/${params.orderNumber}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            content: [
              {
                type: "text",
                text: `Order ${params.orderNumber} not found.`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Error fetching order email ${params.orderNumber}: ${response.status} ${response.statusText}`,
              },
            ],
          };
        }
      }
      
      const data = await response.json();
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch order email: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);

// Get products tool
const getProducts = server.tool(
  "get-products",
  "Get product information by SKU numbers",
  {
    skus: z.array(z.string()).describe("Array of SKU numbers to look up"),
  },
  async (params: { skus: string[] }) => {
    try {
      const response = await fetch(
        `${api_base_url}/product_descriptions/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ skus: params.skus }),
        }
      );
      
      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching products: ${response.status} ${response.statusText}`,
            },
          ],
        };
      }
      
      const data = await response.json();
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch product information: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);


const app = express();
app.use(express.json());

const transport: StreamableHTTPServerTransport =
  new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // set to undefined for stateless servers
  });

// Setup routes for the server
const setupServer = async () => {
  await server.connect(transport);
};

app.post("/mcp", async (req: Request, res: Response) => {
  console.log("Received MCP request:", req.body);
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

app.get("/mcp", async (req: Request, res: Response) => {
  console.log("Received GET MCP request");
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    })
  );
});

app.delete("/mcp", async (req: Request, res: Response) => {
  console.log("Received DELETE MCP request");
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    })
  );
});

// Start the server
const PORT = process.env.PORT || 3000;
setupServer()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`MCP Streamable HTTP Server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to set up the server:", error);
    process.exit(1);
  });
