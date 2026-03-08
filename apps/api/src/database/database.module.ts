import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongoClient } from "mongodb";
import { Config } from "../config/configuration";

export const MONGO_CLIENT = "MONGO_CLIENT";

@Global()
@Module({
  providers: [
    {
      provide: MONGO_CLIENT,
      useFactory: async (configService: ConfigService) => {
        const config = configService.get<Config>("config");
        const uri = config?.mongodb?.uri || process.env.MONGODB_URI || "";

        if (!uri) {
          throw new Error("MONGODB_URI is not configured");
        }

        const client = new MongoClient(uri);
        await client.connect();
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [MONGO_CLIENT],
})
export class DatabaseModule {}
