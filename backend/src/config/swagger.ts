
import swaggerJsdoc from "swagger-jsdoc";
import path from "node:path";

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",

    info: {
      title: "Customer Inquiry Management System API",
      version: "1.0.0",
      description:
        "REST API documentation for authentication, staff management, " +
        "customer inquiries, and inquiry lifecycle management.",
    },

    servers: [
      {
        url: process.env.BACKEND_URL || "http://localhost:5000",
        description: "Local development server",
      },
    ],

    tags: [
      {
        name: "Health",
        description: "API health checks",
      },
      {
        name: "Authentication",
        description: "Authentication operations",
      },
      {
        name: "Staff Management",
        description: "Admin staff management",
      },
      {
        name: "Inquiries",
        description: "Customer inquiry management",
      },
    ],

    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
          description:
            "HTTP-only access token cookie authentication.",
        },
      },
    },
  },

  // Explicit paths avoid wildcard discovery issues on Windows.
  apis: [
    path.resolve(process.cwd(), "src/routes/auth.routes.ts"),
    path.resolve(process.cwd(), "src/routes/user.routes.ts"),
    path.resolve(process.cwd(), "src/routes/inquiry.routes.ts"),
    path.resolve(process.cwd(), "src/app.ts"),
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
