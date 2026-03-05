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
      useFactory: async (configService: ConfigService<Config, true>) => {
        const uri = configService.get("mongodb.uri", { infer: true });
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
