import "./telemetry/otel";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module";
import { dumpRoutes } from "./route-inventory";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const config = new DocumentBuilder()
    .setTitle("BenchCRM API")
    .setDescription("BenchCRM MVP API documentation")
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  if (process.env.ENABLE_DEV_ROUTES === "1") {
    app.getHttpAdapter().getInstance().get("/__dev/routes", (_: any, res: any) => {
      const routes = dumpRoutes(app);
      res.json({ routes });
    });

    // Also expose under global prefix for convenience (works whether callers include /api or not)
    app.getHttpAdapter().getInstance().get("/api/__dev/routes", (_: any, res: any) => {
      const routes = dumpRoutes(app);
      res.json({ routes });
    });
  }

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  logger.log(`BenchCRM API listening on port ${port}`);
}

void bootstrap();
